use anchor_lang::prelude::*;
use anchor_lang::prelude::Clock;
use anchor_spl::token::{Mint, Token, TokenAccount, Transfer, transfer, CloseAccount, close_account};

declare_id!("ByKpVE7PmU4oQwoJLfMcD9CqFkDXRhsZkq3X4xfNUQ3P");

//spring renew umbrella benefit garden leaf earn army van stand winner two

#[program]
pub mod anchor_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let token_holder = &mut ctx.accounts.token_holder;
        token_holder.initialized = true;
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        let sender = &ctx.accounts.user;
        let sender_tokens = &ctx.accounts.token_account;
        let receiver_account = &ctx.accounts.receiver_account;
        let escrow = &mut ctx.accounts.escrow;
        let token_program = &ctx.accounts.token_program;

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;


        escrow.last_claimed_at = 0;
        escrow.total_claimed = 0;
        escrow.staked_at = current_timestamp;
        escrow.owner = ctx.accounts.user.key();
        escrow.mint = ctx.accounts.mint.key();
    
        transfer(
            CpiContext::new(
                token_program.to_account_info(),
                Transfer {
                    from: sender_tokens.to_account_info(),
                    to: receiver_account.to_account_info(),
                    authority: sender.to_account_info(),
                },
            ),
            1,
        )?;


        Ok(())
    }

    pub fn unstake(ctx: Context<UnStake>) -> Result<()> {
        let sender = &mut &ctx.accounts.user;
        let sender_tokens = &mut ctx.accounts.token_account;
        let receiver_account = &mut ctx.accounts.receiver_account;
        let escrow = &mut ctx.accounts.escrow;
        let token_program = &ctx.accounts.token_program;
        let authority = &mut ctx.accounts.authority;
        let reward_vault_acc = &mut ctx.accounts.reward_vault_acc;
        let reward_user_acc = &mut ctx.accounts.reward_user_acc;

        if escrow.owner != sender.key() {
            return err!(MyError::NotOwner);
        }

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;


        // 1 token / sec
        let mut reward_amount: u64 = 0;
        if escrow.last_claimed_at == 0 {
            reward_amount = (current_timestamp - escrow.staked_at) as u64;
        } else {
            reward_amount = (current_timestamp - escrow.last_claimed_at) as u64;
        }

        reward_amount = reward_amount * 1000000000;

        let token_bumps = 255;

        let seeds = &[
            "tokenauthority".as_bytes(),
            &[token_bumps]
        ];

        let signer_seeds = &[&seeds[..]];

    
        // transfer reward also
        transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                Transfer {
                    from: reward_vault_acc.to_account_info(),
                    to: reward_user_acc.to_account_info(),
                    authority: authority.to_account_info(),
                },
                signer_seeds,
            ),
            reward_amount,
        )?;

        transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                Transfer {
                    from: sender_tokens.to_account_info(),
                    to: receiver_account.to_account_info(),
                    authority: authority.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;


        close_account(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                CloseAccount {
                    account: sender_tokens.to_account_info(),
                    destination: sender.to_account_info(),
                    authority: authority.to_account_info(),
                },
                signer_seeds,
            )
        )?;


        let rent = Rent::get()?.minimum_balance(escrow.to_account_info().data_len());
        **escrow.to_account_info().try_borrow_mut_lamports()? -= rent;
        **sender.to_account_info().try_borrow_mut_lamports()? += rent;


        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let sender = &mut &ctx.accounts.user;
        let escrow = &mut ctx.accounts.escrow;
        let token_program = &ctx.accounts.token_program;
        let authority = &mut ctx.accounts.authority;
        let reward_vault_acc = &mut ctx.accounts.reward_vault_acc;
        let reward_user_acc = &mut ctx.accounts.reward_user_acc;

        if escrow.owner != sender.key() {
            return err!(MyError::NotOwner);
        }

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;


        // 1 token / sec
        let mut reward_amount: u64 = 0;
        if escrow.last_claimed_at == 0 {
            reward_amount = (current_timestamp - escrow.staked_at) as u64;
        } else {
            reward_amount = (current_timestamp - escrow.last_claimed_at) as u64;
        }

        reward_amount = reward_amount * 1000000000;

        escrow.last_claimed_at = current_timestamp;
        escrow.total_claimed += reward_amount;

        let token_bumps = 255;

        let seeds = &[
            "tokenauthority".as_bytes(),
            &[token_bumps]
        ];

        let signer_seeds = &[&seeds[..]];

    
        // transfer reward also
        transfer(
            CpiContext::new_with_signer(
                token_program.to_account_info(),
                Transfer {
                    from: reward_vault_acc.to_account_info(),
                    to: reward_user_acc.to_account_info(),
                    authority: authority.to_account_info(),
                },
                signer_seeds,
            ),
            reward_amount,
        )?;


        Ok(())
    }
}

#[error_code]
pub enum MyError {
    #[msg("Cannot withdraw if not owner")]
    NotOwner
}

#[derive(Accounts)]
pub struct Initialize<'info> {

    #[account(init, payer=user,space=32,  seeds=[b"tokenauthority"], bump)]
    pub token_holder: Account<'info, TokenHolderAcc>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,


}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(init, payer=user, space=32 + 8 + 8 + 8 + 32 + 32, seeds=[b"escrow", user.key().as_ref(), mint.key().as_ref()], bump)]
    pub escrow: Account<'info, EscrowStake>,

    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub receiver_account: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,

    pub token_program: Program<'info, Token>,
}



#[derive(Accounts)]
pub struct UnStake<'info> {
    #[account(mut,seeds=[b"escrow", user.key().as_ref(), mint.key().as_ref()], bump)]
    pub escrow: Account<'info, EscrowStake>,

    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub receiver_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub reward_vault_acc: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub reward_user_acc: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds=[b"tokenauthority"], bump)]
    pub authority: Box<Account<'info, TokenHolderAcc>>,

    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>

}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut,seeds=[b"escrow", user.key().as_ref(), mint.key().as_ref()], bump)]
    pub escrow: Account<'info, EscrowStake>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    #[account(mut)]
    pub reward_vault_acc: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub reward_user_acc: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds=[b"tokenauthority"], bump)]
    pub authority: Box<Account<'info, TokenHolderAcc>>,

    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>

}

#[account]
pub struct EscrowStake {
    pub last_claimed_at: i64, // timestamp
    pub staked_at: i64,  // timestamp
    pub total_claimed: u64, // tatal o coins claimed
    pub mint: Pubkey,
    pub owner: Pubkey,
}

#[account]
pub struct TokenHolderAcc {
    initialized: bool
}