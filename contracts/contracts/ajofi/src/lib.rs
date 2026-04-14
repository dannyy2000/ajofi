#![no_std]

mod test;

use soroban_sdk::{
    contract, contractimpl, contracttype, token,
    Address, Env, String, Vec,
    symbol_short,
};

// ─────────────────────────────────────────────────────────────────────────────
// Data Types
// ─────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum GroupStatus {
    Forming,
    Active,
    Completed,
}

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub enum FundStatus {
    Idle,
    Deployed,
}

#[contracttype]
#[derive(Clone)]
pub struct Member {
    pub wallet:              Address,
    pub has_paid:            bool,
    pub has_collateral:      bool,
    pub has_received_payout: bool,
    pub credit_score:        u32,   // 0–100
    pub default_count:       u32,
}

#[contracttype]
#[derive(Clone)]
pub struct Group {
    pub id:                  u64,
    pub contribution_amount: i128,   // in stroops (USDC smallest unit)
    pub collateral_amount:   i128,   // 2x contribution for new members
    pub total_members:       u32,
    pub current_round:       u32,    // 1-indexed, 0 = not started
    pub paid_count:          u32,
    pub round_deadline:      u64,    // unix timestamp
    pub round_duration:      u64,    // seconds
    pub status:              GroupStatus,
    pub fund_status:         FundStatus,
    pub yield_earned:        i128,
    pub created_at:          u64,
    pub member_addresses:    Vec<Address>,
}

#[contracttype]
#[derive(Clone)]
pub struct Intent {
    pub wallet:              Address,
    pub contribution_amount: i128,
    pub desired_group_size:  u32,
    pub round_duration:      u64,
    pub matched:             bool,
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    Agent,
    UsdcToken,
    GroupCount,
    IntentCount,
    Group(u64),
    Member(u64, Address),        // (group_id, wallet)
    Intent(u64),
    WalletIntent(Address),       // wallet → intent_id
    MemberGroups(Address),       // wallet → Vec<group_id>
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract
// ─────────────────────────────────────────────────────────────────────────────

#[contract]
pub struct AjoFi;

#[contractimpl]
impl AjoFi {

    // ─────────────────────────────────────────────────────────────────────────
    // Initialize
    // ─────────────────────────────────────────────────────────────────────────

    pub fn initialize(env: Env, admin: Address, agent: Address, usdc_token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Agent, &agent);
        env.storage().instance().set(&DataKey::UsdcToken, &usdc_token);
        env.storage().instance().set(&DataKey::GroupCount, &0u64);
        env.storage().instance().set(&DataKey::IntentCount, &0u64);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Intent Registration
    // ─────────────────────────────────────────────────────────────────────────

    /// User registers their savings intent for AI matchmaking
    pub fn register_intent(
        env:                 Env,
        caller:              Address,
        contribution_amount: i128,
        desired_group_size:  u32,
        round_duration:      u64,
    ) -> u64 {
        caller.require_auth();

        if contribution_amount <= 0 {
            panic!("contribution must be positive");
        }
        if desired_group_size < 2 || desired_group_size > 10 {
            panic!("group size must be between 2 and 10");
        }

        // Check if wallet already has an unmatched intent
        if env.storage().persistent().has(&DataKey::WalletIntent(caller.clone())) {
            let existing_id: u64 = env.storage().persistent()
                .get(&DataKey::WalletIntent(caller.clone()))
                .unwrap();
            let existing: Intent = env.storage().persistent()
                .get(&DataKey::Intent(existing_id))
                .unwrap();
            if !existing.matched {
                panic!("already has an active intent");
            }
        }

        let mut count: u64 = env.storage().instance().get(&DataKey::IntentCount).unwrap();
        count += 1;

        let intent = Intent {
            wallet:              caller.clone(),
            contribution_amount,
            desired_group_size,
            round_duration,
            matched:             false,
        };

        env.storage().persistent().set(&DataKey::Intent(count), &intent);
        env.storage().persistent().set(&DataKey::WalletIntent(caller.clone()), &count);
        env.storage().instance().set(&DataKey::IntentCount, &count);

        env.events().publish(
            (symbol_short!("INTENT"), caller),
            (count, contribution_amount, desired_group_size, round_duration),
        );

        count
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Group Creation (agent only)
    // ─────────────────────────────────────────────────────────────────────────

    /// Agent creates a group from matched intents
    pub fn create_group(
        env:                 Env,
        member_wallets:      Vec<Address>,
        contribution_amount: i128,
        round_duration:      u64,
    ) -> u64 {
        let agent: Address = env.storage().instance().get(&DataKey::Agent).unwrap();
        agent.require_auth();

        let total = member_wallets.len();
        if total < 2 {
            panic!("need at least 2 members");
        }

        let mut group_count: u64 = env.storage().instance().get(&DataKey::GroupCount).unwrap();
        group_count += 1;

        let group = Group {
            id:                  group_count,
            contribution_amount,
            collateral_amount:   contribution_amount * 2,
            total_members:       total,
            current_round:       0,
            paid_count:          0,
            round_deadline:      0,
            round_duration,
            status:              GroupStatus::Forming,
            fund_status:         FundStatus::Idle,
            yield_earned:        0,
            created_at:          env.ledger().timestamp(),
            member_addresses:    member_wallets.clone(),
        };

        env.storage().persistent().set(&DataKey::Group(group_count), &group);

        // Initialize each member
        for wallet in member_wallets.iter() {
            let member = Member {
                wallet:              wallet.clone(),
                has_paid:            false,
                has_collateral:      false,
                has_received_payout: false,
                credit_score:        100,
                default_count:       0,
            };
            env.storage().persistent().set(&DataKey::Member(group_count, wallet.clone()), &member);

            // Track groups per wallet
            let mut member_groups: Vec<u64> = env.storage().persistent()
                .get(&DataKey::MemberGroups(wallet.clone()))
                .unwrap_or(Vec::new(&env));
            member_groups.push_back(group_count);
            env.storage().persistent().set(&DataKey::MemberGroups(wallet.clone()), &member_groups);

            // Mark their intent as matched
            if env.storage().persistent().has(&DataKey::WalletIntent(wallet.clone())) {
                let intent_id: u64 = env.storage().persistent()
                    .get(&DataKey::WalletIntent(wallet.clone()))
                    .unwrap();
                let mut intent: Intent = env.storage().persistent()
                    .get(&DataKey::Intent(intent_id))
                    .unwrap();
                intent.matched = true;
                env.storage().persistent().set(&DataKey::Intent(intent_id), &intent);
            }
        }

        env.storage().instance().set(&DataKey::GroupCount, &group_count);

        env.events().publish(
            (symbol_short!("GRP_NEW"), group_count),
            (contribution_amount, round_duration, total),
        );

        group_count
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Collateral (members)
    // ─────────────────────────────────────────────────────────────────────────

    /// Member locks collateral to join the group
    pub fn lock_collateral(env: Env, caller: Address, group_id: u64) {
        caller.require_auth();

        let mut group: Group = env.storage().persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        if group.status != GroupStatus::Forming {
            panic!("group is not in forming state");
        }

        let mut member: Member = env.storage().persistent()
            .get(&DataKey::Member(group_id, caller.clone()))
            .expect("not a member of this group");

        if member.has_collateral {
            panic!("collateral already locked");
        }

        // Transfer collateral from member to contract
        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc);
        token_client.transfer(&caller, &env.current_contract_address(), &group.collateral_amount);

        member.has_collateral = true;
        env.storage().persistent().set(&DataKey::Member(group_id, caller.clone()), &member);

        env.events().publish(
            (symbol_short!("COL_LOCK"), group_id),
            caller.clone(),
        );

        // Check if all members have locked — activate group if so
        let all_locked = group.member_addresses.iter().all(|addr| {
            let m: Member = env.storage().persistent()
                .get(&DataKey::Member(group_id, addr.clone()))
                .unwrap();
            m.has_collateral
        });

        if all_locked {
            group.status = GroupStatus::Active;
            group.current_round = 1;
            group.round_deadline = env.ledger().timestamp() + group.round_duration;
            env.storage().persistent().set(&DataKey::Group(group_id), &group);

            env.events().publish(
                (symbol_short!("GRP_ACT"), group_id),
                env.ledger().timestamp(),
            );
        } else {
            env.storage().persistent().set(&DataKey::Group(group_id), &group);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Contributions (members)
    // ─────────────────────────────────────────────────────────────────────────

    /// Member pays their contribution for the current round
    pub fn pay_contribution(env: Env, caller: Address, group_id: u64) {
        caller.require_auth();

        let mut group: Group = env.storage().persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        if group.status != GroupStatus::Active {
            panic!("group is not active");
        }

        let mut member: Member = env.storage().persistent()
            .get(&DataKey::Member(group_id, caller.clone()))
            .expect("not a member of this group");

        if !member.has_collateral {
            panic!("collateral not locked");
        }
        if member.has_paid {
            panic!("already paid this round");
        }

        // Transfer contribution from member to contract
        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc);
        token_client.transfer(&caller, &env.current_contract_address(), &group.contribution_amount);

        member.has_paid = true;
        group.paid_count += 1;

        env.storage().persistent().set(&DataKey::Member(group_id, caller.clone()), &member);
        env.storage().persistent().set(&DataKey::Group(group_id), &group);

        env.events().publish(
            (symbol_short!("CONTRIB"), group_id),
            (group.current_round, caller),
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Round Advancement (agent only)
    // ─────────────────────────────────────────────────────────────────────────

    /// Agent advances the round and pays the winner
    pub fn advance_round(env: Env, group_id: u64, winner: Address) {
        let agent: Address = env.storage().instance().get(&DataKey::Agent).unwrap();
        agent.require_auth();

        let mut group: Group = env.storage().persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        if group.status != GroupStatus::Active {
            panic!("group is not active");
        }
        if group.fund_status == FundStatus::Deployed {
            panic!("funds still deployed — withdraw first");
        }

        // Payout = contributions from all paid members + any yield earned
        let mut payout = group.paid_count as i128 * group.contribution_amount;
        if group.yield_earned > 0 {
            payout += group.yield_earned;
            group.yield_earned = 0;
        }

        let round_just_completed = group.current_round;

        // Reset payment state for all members
        for addr in group.member_addresses.iter() {
            let mut m: Member = env.storage().persistent()
                .get(&DataKey::Member(group_id, addr.clone()))
                .unwrap();
            m.has_paid = false;
            env.storage().persistent().set(&DataKey::Member(group_id, addr.clone()), &m);
        }
        group.paid_count = 0;

        // Mark winner and transfer payout
        let mut winner_member: Member = env.storage().persistent()
            .get(&DataKey::Member(group_id, winner.clone()))
            .expect("winner not a member");
        winner_member.has_received_payout = true;
        env.storage().persistent().set(&DataKey::Member(group_id, winner.clone()), &winner_member);

        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc);
        token_client.transfer(&env.current_contract_address(), &winner, &payout);

        env.events().publish(
            (symbol_short!("PAYOUT"), group_id),
            (round_just_completed, winner.clone(), payout),
        );

        // Check if this was the last round
        if round_just_completed == group.total_members {
            group.status = GroupStatus::Completed;
            env.storage().persistent().set(&DataKey::Group(group_id), &group);

            env.events().publish(
                (symbol_short!("GRP_END"), group_id),
                round_just_completed,
            );

            Self::return_collateral(&env, group_id);
        } else {
            group.current_round += 1;
            group.round_deadline = env.ledger().timestamp() + group.round_duration;
            env.storage().persistent().set(&DataKey::Group(group_id), &group);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Default Handling (agent only)
    // ─────────────────────────────────────────────────────────────────────────

    /// Agent slashes a defaulting member's collateral and pays the winner
    pub fn handle_default(
        env:      Env,
        group_id: u64,
        defaulter: Address,
        winner:   Address,
        reason:   String,
    ) {
        let agent: Address = env.storage().instance().get(&DataKey::Agent).unwrap();
        agent.require_auth();

        let mut group: Group = env.storage().persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        if group.status != GroupStatus::Active {
            panic!("group is not active");
        }

        let mut dm: Member = env.storage().persistent()
            .get(&DataKey::Member(group_id, defaulter.clone()))
            .expect("defaulter not a member");

        if !dm.has_collateral {
            panic!("defaulter has no collateral to slash");
        }

        let slash_amount = group.collateral_amount;
        dm.has_collateral = false;
        dm.default_count += 1;

        // Credit score penalty — heavier for repeat offenders
        let penalty: u32 = if dm.default_count == 1 { 20 } else { 40 };
        dm.credit_score = dm.credit_score.saturating_sub(penalty);

        env.storage().persistent().set(&DataKey::Member(group_id, defaulter.clone()), &dm);

        env.events().publish(
            (symbol_short!("DEFAULT"), group_id),
            (defaulter.clone(), slash_amount, reason, dm.credit_score),
        );

        // Payout = contributions from paying members + slashed collateral
        let payout = group.paid_count as i128 * group.contribution_amount + slash_amount;

        // Reset payment state for next round
        for addr in group.member_addresses.iter() {
            let mut m: Member = env.storage().persistent()
                .get(&DataKey::Member(group_id, addr.clone()))
                .unwrap();
            m.has_paid = false;
            env.storage().persistent().set(&DataKey::Member(group_id, addr.clone()), &m);
        }
        group.paid_count = 0;

        // Pay the winner
        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(&env, &usdc);
        token_client.transfer(&env.current_contract_address(), &winner, &payout);

        env.events().publish(
            (symbol_short!("PAYOUT"), group_id),
            (group.current_round, winner.clone(), payout),
        );

        if group.current_round == group.total_members {
            group.status = GroupStatus::Completed;
            env.storage().persistent().set(&DataKey::Group(group_id), &group);
            env.events().publish((symbol_short!("GRP_END"), group_id), group.current_round);
            Self::return_collateral(&env, group_id);
        } else {
            group.current_round += 1;
            group.round_deadline = env.ledger().timestamp() + group.round_duration;
            env.storage().persistent().set(&DataKey::Group(group_id), &group);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Yield Management (agent only) — Blend Protocol hooks
    // ─────────────────────────────────────────────────────────────────────────

    /// Agent marks funds as deployed to Blend (actual Blend call happens in agent)
    pub fn mark_deployed(env: Env, group_id: u64) {
        let agent: Address = env.storage().instance().get(&DataKey::Agent).unwrap();
        agent.require_auth();

        let mut group: Group = env.storage().persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        if group.status != GroupStatus::Active {
            panic!("group not active");
        }
        if group.fund_status == FundStatus::Deployed {
            panic!("already deployed");
        }

        group.fund_status = FundStatus::Deployed;
        env.storage().persistent().set(&DataKey::Group(group_id), &group);

        env.events().publish(
            (symbol_short!("DEPLOYED"), group_id),
            group.paid_count as i128 * group.contribution_amount,
        );
    }

    /// Agent records yield earned and marks funds as returned from Blend
    pub fn mark_withdrawn(env: Env, group_id: u64, yield_amount: i128) {
        let agent: Address = env.storage().instance().get(&DataKey::Agent).unwrap();
        agent.require_auth();

        let mut group: Group = env.storage().persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        if group.fund_status != FundStatus::Deployed {
            panic!("funds not deployed");
        }

        group.fund_status = FundStatus::Idle;
        group.yield_earned += yield_amount;
        env.storage().persistent().set(&DataKey::Group(group_id), &group);

        env.events().publish(
            (symbol_short!("WITHDRAW"), group_id),
            yield_amount,
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Credit Score Update (agent only)
    // ─────────────────────────────────────────────────────────────────────────

    /// Agent updates a member's credit score after scoring
    pub fn update_credit_score(
        env:       Env,
        group_id:  u64,
        wallet:    Address,
        new_score: u32,
    ) {
        let agent: Address = env.storage().instance().get(&DataKey::Agent).unwrap();
        agent.require_auth();

        let mut member: Member = env.storage().persistent()
            .get(&DataKey::Member(group_id, wallet.clone()))
            .expect("member not found");

        member.credit_score = new_score.min(100);
        env.storage().persistent().set(&DataKey::Member(group_id, wallet.clone()), &member);

        env.events().publish(
            (symbol_short!("SCORE"), wallet),
            (group_id, new_score),
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // View Functions
    // ─────────────────────────────────────────────────────────────────────────

    pub fn get_group(env: Env, group_id: u64) -> Group {
        env.storage().persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found")
    }

    pub fn get_member(env: Env, group_id: u64, wallet: Address) -> Member {
        env.storage().persistent()
            .get(&DataKey::Member(group_id, wallet))
            .expect("member not found")
    }

    pub fn get_group_members(env: Env, group_id: u64) -> Vec<Member> {
        let group: Group = env.storage().persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        let mut members = Vec::new(&env);
        for addr in group.member_addresses.iter() {
            let m: Member = env.storage().persistent()
                .get(&DataKey::Member(group_id, addr.clone()))
                .unwrap();
            members.push_back(m);
        }
        members
    }

    pub fn get_intent(env: Env, intent_id: u64) -> Intent {
        env.storage().persistent()
            .get(&DataKey::Intent(intent_id))
            .expect("intent not found")
    }

    pub fn get_all_intents(env: Env) -> Vec<Intent> {
        let count: u64 = env.storage().instance().get(&DataKey::IntentCount).unwrap_or(0);
        let mut result = Vec::new(&env);
        for i in 1..=count {
            if let Some(intent) = env.storage().persistent().get::<DataKey, Intent>(&DataKey::Intent(i)) {
                result.push_back(intent);
            }
        }
        result
    }

    pub fn get_all_active_groups(env: Env) -> Vec<u64> {
        let count: u64 = env.storage().instance().get(&DataKey::GroupCount).unwrap_or(0);
        let mut result = Vec::new(&env);
        for i in 1..=count {
            if let Some(group) = env.storage().persistent().get::<DataKey, Group>(&DataKey::Group(i)) {
                if group.status == GroupStatus::Active {
                    result.push_back(i);
                }
            }
        }
        result
    }

    pub fn get_member_groups(env: Env, wallet: Address) -> Vec<u64> {
        env.storage().persistent()
            .get(&DataKey::MemberGroups(wallet))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_idle_funds(env: Env, group_id: u64) -> i128 {
        let group: Group = env.storage().persistent()
            .get(&DataKey::Group(group_id))
            .expect("group not found");

        if group.fund_status == FundStatus::Deployed {
            return 0;
        }
        group.paid_count as i128 * group.contribution_amount
    }

    pub fn get_group_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::GroupCount).unwrap_or(0)
    }

    pub fn get_intent_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::IntentCount).unwrap_or(0)
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────────────────────────────────

    fn return_collateral(env: &Env, group_id: u64) {
        let group: Group = env.storage().persistent()
            .get(&DataKey::Group(group_id))
            .unwrap();

        let usdc: Address = env.storage().instance().get(&DataKey::UsdcToken).unwrap();
        let token_client = token::Client::new(env, &usdc);

        for addr in group.member_addresses.iter() {
            let m: Member = env.storage().persistent()
                .get(&DataKey::Member(group_id, addr.clone()))
                .unwrap();

            if m.has_collateral {
                token_client.transfer(
                    &env.current_contract_address(),
                    &addr,
                    &group.collateral_amount,
                );
                env.events().publish(
                    (symbol_short!("COL_RET"), group_id),
                    addr.clone(),
                );
            }
        }
    }
}
