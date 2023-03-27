use anchor_lang::prelude::*;
use anchor_lang::prelude::Clock;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod anchor_program {
    use super::*;

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        let sender = &ctx.accounts.user;
        let sender_tokens = &ctx.accounts.token_account;
        let escrow = &ctx.accounts.escrow;
        let token_program = &ctx.accounts.token_program;

        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;


        escrow.last_claimed_at = 0;
        escrow.total_claimed = 0;
        escrow.staked_at = current_timestamp;
        escrow.mint = *ctx.accounts.mint;
    
        transfer(
            CpiContext::new(
                token_program.to_account_info(),
                Transfer {
                    from: sender_tokens.to_account_info(),
                    to: escrow.to_account_info(),
                    authority: sender.to_account_info(),
                },
            ),
            1,
        )?;


        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}


#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(init, payer=user, space=5000, seeds=[b"escrow", user.key().as_ref(), mint.key().as_ref()], bump)]
    pub escrow: Account<'info, EscrowStake>,

    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut, 
        token_account::mint = mint, 
        token_account::authority = user)]
    pub token_account: Account<'info, TokenAccount>,
    pub system_program: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
}

#[account]
pub struct EscrowStake {
    pub last_claimed_at: i64, // timestamp
    pub staked_at: i64,  // timestamp
    pub total_claimed: u64, // tatal o coins claimed
    pub mint: Pubkey,
}