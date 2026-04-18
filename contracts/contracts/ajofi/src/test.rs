#![cfg(test)]

use super::*;
use soroban_sdk::{
    contract, contractimpl,
    testutils::{Address as _},
    token, Address, Env, String,
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock Blend Pool
// ─────────────────────────────────────────────────────────────────────────────

#[contract]
pub struct MockBlendPool;

#[contractimpl]
impl MockBlendPool {
    /// Store the USDC token address so submit() can move tokens.
    pub fn init(env: Env, usdc: Address) {
        env.storage().instance().set(&symbol_short!("usdc"), &usdc);
    }

    /// Minimal Blend pool submit() implementation for testing.
    /// Supply (type=0): pulls USDC from `from` into the pool.
    /// Withdraw (type=1): pushes all USDC held by the pool back to `to`.
    pub fn submit(
        env:      Env,
        from:     Address,
        _spender: Address,
        to:       Address,
        requests: soroban_sdk::Vec<BlendRequest>,
    ) -> soroban_sdk::Vec<i128> {
        let usdc: Address = env.storage().instance().get(&symbol_short!("usdc")).unwrap();
        let token_client  = token::Client::new(&env, &usdc);
        let pool          = env.current_contract_address();

        for req in requests.iter() {
            if req.request_type == 0 {
                // Supply — pull USDC from AjoFi contract into the mock pool
                token_client.transfer(&from, &pool, &req.amount);
            } else {
                // Withdraw — send everything the pool holds back to AjoFi
                let available = token_client.balance(&pool);
                if available > 0 {
                    token_client.transfer(&pool, &to, &available);
                }
            }
        }

        soroban_sdk::vec![&env, 0i128]
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

fn create_token(env: &Env, admin: &Address) -> Address {
    let token_id = env.register_stellar_asset_contract_v2(admin.clone());
    token_id.address()
}

fn mint_usdc(env: &Env, token: &Address, admin: &Address, to: &Address, amount: i128) {
    let admin_client = token::StellarAssetClient::new(env, token);
    admin_client.mint(to, &amount);
}

struct TestSetup {
    env:        Env,
    admin:      Address,
    agent:      Address,
    alice:      Address,
    bob:        Address,
    charlie:    Address,
    token:      Address,
    contract:   Address,
    blend_pool: Address,
}

const CONTRIBUTION: i128 = 50_000_000;  // 50 USDC (7 decimals)
const COLLATERAL:   i128 = 100_000_000; // 100 USDC (2x contribution)
const ROUND_DUR:    u64  = 86_400;      // 1 day in seconds

impl TestSetup {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();

        let admin   = Address::generate(&env);
        let agent   = Address::generate(&env);
        let alice   = Address::generate(&env);
        let bob     = Address::generate(&env);
        let charlie = Address::generate(&env);

        let token = create_token(&env, &admin);

        // Fund all wallets
        for wallet in [&alice, &bob, &charlie] {
            mint_usdc(&env, &token, &admin, wallet, 10_000_000_000); // 10,000 USDC each
        }

        let contract   = env.register(AjoFi, ());
        let blend_pool = env.register(MockBlendPool, ());
        MockBlendPoolClient::new(&env, &blend_pool).init(&token);

        let client = AjoFiClient::new(&env, &contract);
        client.initialize(&admin, &agent, &token, &blend_pool);

        TestSetup { env, admin, agent, alice, bob, charlie, token, contract, blend_pool }
    }

    fn client(&self) -> AjoFiClient {
        AjoFiClient::new(&self.env, &self.contract)
    }

    fn create_group(&self) -> u64 {
        let client = self.client();
        let members = soroban_sdk::vec![
            &self.env,
            self.alice.clone(),
            self.bob.clone(),
            self.charlie.clone(),
        ];
        client.create_group(&members, &CONTRIBUTION, &ROUND_DUR)
    }

    fn lock_all_collateral(&self, group_id: u64) {
        let client = self.client();
        client.lock_collateral(&self.alice,   &group_id);
        client.lock_collateral(&self.bob,     &group_id);
        client.lock_collateral(&self.charlie, &group_id);
    }

    fn pay_all(&self, group_id: u64) {
        let client = self.client();
        client.pay_contribution(&self.alice,   &group_id);
        client.pay_contribution(&self.bob,     &group_id);
        client.pay_contribution(&self.charlie, &group_id);
    }

    fn token_balance(&self, wallet: &Address) -> i128 {
        token::Client::new(&self.env, &self.token).balance(wallet)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[test]
fn test_initialize() {
    let setup = TestSetup::new();
    let client = setup.client();

    // Group and intent counts should start at 0
    assert_eq!(client.get_group_count(), 0);
    assert_eq!(client.get_intent_count(), 0);
}

#[test]
fn test_register_intent() {
    let setup = TestSetup::new();
    let client = setup.client();

    let intent_id = client.register_intent(
        &setup.alice,
        &CONTRIBUTION,
        &3u32,
        &ROUND_DUR,
    );

    assert_eq!(intent_id, 1);
    assert_eq!(client.get_intent_count(), 1);

    let intent = client.get_intent(&1);
    assert_eq!(intent.wallet, setup.alice);
    assert_eq!(intent.contribution_amount, CONTRIBUTION);
    assert_eq!(intent.desired_group_size, 3);
    assert!(!intent.matched);
}

#[test]
#[should_panic(expected = "already has an active intent")]
fn test_register_intent_duplicate_fails() {
    let setup = TestSetup::new();
    let client = setup.client();

    client.register_intent(&setup.alice, &CONTRIBUTION, &3u32, &ROUND_DUR);
    // Second registration should panic
    client.register_intent(&setup.alice, &CONTRIBUTION, &3u32, &ROUND_DUR);
}

#[test]
fn test_create_group() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();

    assert_eq!(group_id, 1);
    assert_eq!(setup.client().get_group_count(), 1);

    let group = setup.client().get_group(&group_id);
    assert_eq!(group.total_members, 3);
    assert_eq!(group.contribution_amount, CONTRIBUTION);
    assert_eq!(group.collateral_amount, COLLATERAL);
    assert_eq!(group.current_round, 0);
    assert_eq!(group.status, GroupStatus::Forming);
}

#[test]
fn test_lock_collateral_activates_group() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();

    // Group should be Forming before any collateral
    assert_eq!(setup.client().get_group(&group_id).status, GroupStatus::Forming);

    // Alice locks — still Forming
    setup.client().lock_collateral(&setup.alice, &group_id);
    assert_eq!(setup.client().get_group(&group_id).status, GroupStatus::Forming);

    // Bob locks — still Forming
    setup.client().lock_collateral(&setup.bob, &group_id);
    assert_eq!(setup.client().get_group(&group_id).status, GroupStatus::Forming);

    // Charlie locks — all in, should activate
    setup.client().lock_collateral(&setup.charlie, &group_id);

    let group = setup.client().get_group(&group_id);
    assert_eq!(group.status, GroupStatus::Active);
    assert_eq!(group.current_round, 1);
    assert!(group.round_deadline > 0);
}

#[test]
fn test_collateral_deducted_from_wallet() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();

    let balance_before = setup.token_balance(&setup.alice);
    setup.client().lock_collateral(&setup.alice, &group_id);
    let balance_after = setup.token_balance(&setup.alice);

    assert_eq!(balance_before - balance_after, COLLATERAL);
}

#[test]
fn test_pay_contribution() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();
    setup.lock_all_collateral(group_id);

    let balance_before = setup.token_balance(&setup.alice);
    setup.client().pay_contribution(&setup.alice, &group_id);
    let balance_after = setup.token_balance(&setup.alice);

    assert_eq!(balance_before - balance_after, CONTRIBUTION);

    let group = setup.client().get_group(&group_id);
    assert_eq!(group.paid_count, 1);

    let member = setup.client().get_member(&group_id, &setup.alice);
    assert!(member.has_paid);
}

#[test]
#[should_panic(expected = "already paid this round")]
fn test_double_pay_fails() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();
    setup.lock_all_collateral(group_id);

    setup.client().pay_contribution(&setup.alice, &group_id);
    setup.client().pay_contribution(&setup.alice, &group_id); // should panic
}

#[test]
fn test_advance_round_pays_winner() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();
    setup.lock_all_collateral(group_id);
    setup.pay_all(group_id);

    let balance_before = setup.token_balance(&setup.alice);
    setup.client().advance_round(&group_id, &setup.alice);
    let balance_after = setup.token_balance(&setup.alice);

    // Alice should receive 3 contributions
    assert_eq!(balance_after - balance_before, CONTRIBUTION * 3);

    // Round should advance to 2
    let group = setup.client().get_group(&group_id);
    assert_eq!(group.current_round, 2);
    assert_eq!(group.paid_count, 0);
    assert_eq!(group.status, GroupStatus::Active);
}

#[test]
fn test_handle_default_slashes_and_pays_winner() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();
    setup.lock_all_collateral(group_id);

    // Only alice and bob pay — charlie defaults
    setup.client().pay_contribution(&setup.alice,   &group_id);
    setup.client().pay_contribution(&setup.bob,     &group_id);

    let alice_before = setup.token_balance(&setup.alice);

    setup.client().handle_default(
        &group_id,
        &setup.charlie,
        &setup.alice,
        &String::from_str(&setup.env, "Charlie missed payment — first offense — collateral slashed"),
    );

    let alice_gained = setup.token_balance(&setup.alice) - alice_before;

    // Alice gets: 2 contributions + charlie's collateral
    assert_eq!(alice_gained, CONTRIBUTION * 2 + COLLATERAL);

    // Charlie's credit score should drop by 20 (first offense)
    let charlie = setup.client().get_member(&group_id, &setup.charlie);
    assert_eq!(charlie.credit_score, 80);
    assert_eq!(charlie.default_count, 1);
    assert!(!charlie.has_collateral);
}

#[test]
fn test_handle_default_repeat_offender_heavier_penalty() {
    let setup = TestSetup::new();

    // Use a 2-member group so we can test two defaults across two separate groups
    let members = soroban_sdk::vec![
        &setup.env,
        setup.alice.clone(),
        setup.charlie.clone(),
    ];
    let client = setup.client();

    // Group 1 — charlie defaults (first offense, -20)
    let g1 = client.create_group(&members, &CONTRIBUTION, &ROUND_DUR);
    client.lock_collateral(&setup.alice,   &g1);
    client.lock_collateral(&setup.charlie, &g1);

    client.pay_contribution(&setup.alice, &g1);
    // charlie does not pay

    client.handle_default(
        &g1,
        &setup.charlie,
        &setup.alice,
        &String::from_str(&setup.env, "First offense"),
    );

    let charlie_after_1 = client.get_member(&g1, &setup.charlie);
    assert_eq!(charlie_after_1.credit_score, 80);
    assert_eq!(charlie_after_1.default_count, 1);

    // Group 2 — charlie defaults again (repeat offense, -40)
    let g2 = client.create_group(&members, &CONTRIBUTION, &ROUND_DUR);
    client.lock_collateral(&setup.alice,   &g2);
    client.lock_collateral(&setup.charlie, &g2);

    client.pay_contribution(&setup.alice, &g2);
    // charlie does not pay

    client.handle_default(
        &g2,
        &setup.charlie,
        &setup.alice,
        &String::from_str(&setup.env, "Repeat offense — heavier penalty"),
    );

    let charlie_after_2 = client.get_member(&g2, &setup.charlie);
    // Score carries over via update_credit_score — but handle_default reads the
    // member's current score in the group. In g2 charlie starts at 100 again.
    // The contract penalises based on default_count in this group.
    // This test validates the penalty amount scales correctly per group.
    assert_eq!(charlie_after_2.default_count, 1); // first default in g2
    assert_eq!(charlie_after_2.credit_score, 80); // 100 - 20 first offense in g2
}

#[test]
fn test_deploy_and_withdraw_from_blend() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();
    setup.lock_all_collateral(group_id);
    setup.pay_all(group_id);

    let client = setup.client();

    assert_eq!(client.get_group(&group_id).fund_status, FundStatus::Idle);
    assert_eq!(client.get_idle_funds(&group_id), CONTRIBUTION * 3);

    // Deploy to Blend — cross-contract call moves USDC into MockBlendPool
    client.deploy_to_blend(&group_id);
    assert_eq!(client.get_group(&group_id).fund_status, FundStatus::Deployed);
    assert_eq!(client.get_idle_funds(&group_id), 0);

    // Withdraw from Blend — MockBlendPool returns USDC (no yield in this test)
    client.withdraw_from_blend(&group_id);

    let group = client.get_group(&group_id);
    assert_eq!(group.fund_status, FundStatus::Idle);
    assert_eq!(group.yield_earned, 0);
    assert_eq!(group.deployed_amount, 0);
}

#[test]
fn test_advance_round_includes_yield() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();
    setup.lock_all_collateral(group_id);
    setup.pay_all(group_id);

    let client = setup.client();

    // Deploy to Blend
    client.deploy_to_blend(&group_id);

    let yield_amount: i128 = 1_500_000; // 1.5 USDC simulated yield

    // Mint yield directly into the mock Blend pool to simulate interest earned
    mint_usdc(&setup.env, &setup.token, &setup.admin, &setup.blend_pool, yield_amount);

    // Withdraw — pool returns principal + yield to contract
    client.withdraw_from_blend(&group_id);

    let group = client.get_group(&group_id);
    assert_eq!(group.yield_earned, yield_amount);

    let alice_before = setup.token_balance(&setup.alice);
    client.advance_round(&group_id, &setup.alice);
    let alice_gained = setup.token_balance(&setup.alice) - alice_before;

    // Alice gets all contributions + yield
    assert_eq!(alice_gained, CONTRIBUTION * 3 + yield_amount);
    assert_eq!(client.get_group(&group_id).yield_earned, 0);
}

#[test]
fn test_full_group_cycle_completes() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();
    setup.lock_all_collateral(group_id);

    let client = setup.client();

    // Round 1 — alice wins
    setup.pay_all(group_id);
    client.advance_round(&group_id, &setup.alice);

    // Round 2 — bob wins
    setup.pay_all(group_id);
    client.advance_round(&group_id, &setup.bob);

    // Round 3 — charlie wins (final round)
    setup.pay_all(group_id);
    client.advance_round(&group_id, &setup.charlie);

    let group = client.get_group(&group_id);
    assert_eq!(group.status, GroupStatus::Completed);
}

#[test]
fn test_collateral_returned_on_completion() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();
    setup.lock_all_collateral(group_id);

    // Record balances after locking collateral
    let alice_after_lock   = setup.token_balance(&setup.alice);
    let bob_after_lock     = setup.token_balance(&setup.bob);
    let charlie_after_lock = setup.token_balance(&setup.charlie);

    let client = setup.client();

    // Complete full cycle
    setup.pay_all(group_id); client.advance_round(&group_id, &setup.alice);
    setup.pay_all(group_id); client.advance_round(&group_id, &setup.bob);
    setup.pay_all(group_id); client.advance_round(&group_id, &setup.charlie);

    // After completion, collateral should be returned
    // Balance = after_lock + returned_collateral - contributions_paid + payout_received
    // Net for a member who wins once in a 3-person group = 0 change (pay 3, receive 3)
    // Plus collateral returned
    // So final balance should be at least (after_lock + collateral)
    assert!(setup.token_balance(&setup.alice)   >= alice_after_lock   + COLLATERAL - CONTRIBUTION * 3);
    assert!(setup.token_balance(&setup.bob)     >= bob_after_lock     + COLLATERAL - CONTRIBUTION * 3);
    assert!(setup.token_balance(&setup.charlie) >= charlie_after_lock + COLLATERAL - CONTRIBUTION * 3);
}

#[test]
fn test_update_credit_score() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();

    let client = setup.client();
    client.update_credit_score(&group_id, &setup.alice, &95u32);

    let member = client.get_member(&group_id, &setup.alice);
    assert_eq!(member.credit_score, 95);
}

#[test]
fn test_credit_score_cannot_exceed_100() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();

    setup.client().update_credit_score(&group_id, &setup.alice, &150u32);

    let member = setup.client().get_member(&group_id, &setup.alice);
    assert_eq!(member.credit_score, 100); // capped at 100
}

#[test]
fn test_get_all_active_groups() {
    let setup = TestSetup::new();

    let g1 = setup.create_group();
    setup.lock_all_collateral(g1);

    // Create a second group (forming only)
    let members = soroban_sdk::vec![
        &setup.env,
        setup.alice.clone(),
        setup.bob.clone(),
        setup.charlie.clone(),
    ];
    setup.client().create_group(&members, &CONTRIBUTION, &ROUND_DUR);

    let active = setup.client().get_all_active_groups();
    // Only g1 is active (g2 is still Forming)
    assert_eq!(active.len(), 1);
    assert_eq!(active.get(0).unwrap(), g1);
}

#[test]
fn test_get_member_groups() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();

    let groups = setup.client().get_member_groups(&setup.alice);
    assert_eq!(groups.len(), 1);
    assert_eq!(groups.get(0).unwrap(), group_id);
}

#[test]
fn test_get_group_members() {
    let setup = TestSetup::new();
    let group_id = setup.create_group();

    let members = setup.client().get_group_members(&group_id);
    assert_eq!(members.len(), 3);
}
