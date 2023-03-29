// TODO: SignMessage
import { AnchorProvider, BN, Program, utils, web3 } from '@project-serum/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAccount, createAssociatedTokenAccount, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Signer, Transaction } from '@solana/web3.js';
import { FC, useEffect, useState } from 'react';
import idl from '../../anchor-program/target/idl/anchor_program.json';

const idl_obj = JSON.parse(JSON.stringify(idl))
const programId = new PublicKey(idl.metadata.address)
/**
 *   "metadata": {
    "address": "ByKpVE7PmU4oQwoJLfMcD9CqFkDXRhsZkq3X4xfNUQ3P"
  }
 */

const getAtaForMint = async (
    mint: web3.PublicKey,
    buyer: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
    return await web3.PublicKey.findProgramAddress(
        [buyer.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
    )
}

export const Stake: FC = () => {
    const ourWallet = useWallet();
    const {connection} = useConnection()

    const [banks, setBanks] = useState([])

    useEffect(()=> {
        getStakeAccounts()
    }, [])

    const getProvider = () => new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())

    const stakeNFT = async () => {
        let mint = new PublicKey('7AeJhkUEoNbUYdGtozJfFjJLVMAMjy6xRLEzA6RtNTGY')
        try {
            const provider = getProvider()
            const program = new Program(idl_obj, programId, provider)

            const [escrow] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode('escrow'), 
                provider.wallet.publicKey?.toBuffer(),
                mint?.toBuffer()
            ],  program.programId)

            const [token_auth] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode('tokenauthority'), 
            ],  program.programId)




            const tokenAccount = (await getAtaForMint(mint, provider.wallet.publicKey))[0]
            const receiverAccount = (await getAtaForMint(mint, token_auth))[0]


            const accInfo = await connection.getAccountInfo(receiverAccount)
            const instrs = []
            if(!accInfo) {
                const instr = await createAssociatedTokenAccountInstruction(provider.wallet.publicKey, receiverAccount, token_auth, mint)
                instrs.push(instr)
            }


            console.log({tokenAccount: tokenAccount?.toBase58()})
            console.log({escrow: escrow?.toBase58()})
            console.log({receiverAccount: receiverAccount?.toBase58()})
            console.log({token_auth: token_auth?.toBase58()})

            const instr2 = await program.methods
        .stake()
        .accountsStrict({
            escrow,
            user: provider.wallet.publicKey,
            mint,
            tokenAccount,
            receiverAccount,
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([]) // add your account
        .instruction()

        instrs.push(instr2)

        const transaction = new Transaction()

        transaction.add(...instrs)
    
        transaction.recentBlockhash = (
            await program.provider.connection.getLatestBlockhash('finalized')
        )?.blockhash
        transaction.feePayer = new PublicKey(provider.wallet.publicKey)

        // const signedTx = await provider.wallet.signTransaction(transaction)

        const tx = await ourWallet.sendTransaction(transaction, provider.connection, {skipPreflight: true})

        console.log({tx})

            // const data = await program.rpc.stake({
            //     accounts: {
            //         escrow,
            //         user: provider.wallet.publicKey,
            //         mint,
            //         tokenAccount,
            //         receiverAccount,
            //         systemProgram: web3.SystemProgram.programId,
            //         tokenProgram: TOKEN_PROGRAM_ID,
            //     }
            // })
        }catch(e){
            console.log(e)
        }
    }

    const init = async () => {
        let mint = new PublicKey('BnrXR2PRsxfuVfqAVioSbz28rkXQZVQ9BHqHpo2i2wm5')
        try {
            const provider = getProvider()
            const program = new Program(idl_obj, programId, provider)

            const [token_auth] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode('tokenauthority'), 
            ],  program.programId)

            const [account_authority] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode('authority'), 
            ],  program.programId)

            const signer = Keypair.fromSecretKey(Buffer.from([194,248,47,30,218,140,231,89,150,162,89,166,209,125,184,15,203,49,27,170,17,182,128,19,207,146,74,112,230,232,128,184,15,160,88,203,46,175,150,7,70,119,89,175,0,93,143,57,109,89,196,234,189,255,35,74,66,190,94,187,12,170,106,204]))


            const instrs = []
           
            console.log({siger: signer.publicKey?.toString()})

            const instr2 = await program.methods
        .initialize()
        .accountsStrict({
            tokenHolder: token_auth,
            accountAuthority: account_authority,
            user: signer.publicKey,
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID
        })
        .signers([signer]) // add your account
        .instruction()

        instrs.push(instr2)

        const transaction = new Transaction()

        transaction.add(...instrs)
    
        transaction.recentBlockhash = (
            await program.provider.connection.getLatestBlockhash('finalized')
        )?.blockhash
        transaction.feePayer = new PublicKey(signer.publicKey)

        // const signedTx = await provider.wallet.signTransaction(transaction)
        transaction.sign(signer)

        const tx = await provider.connection.sendRawTransaction(transaction.serialize(), {skipPreflight: true})

        console.log({tx})

            // const data = await program.rpc.stake({
            //     accounts: {
            //         escrow,
            //         user: provider.wallet.publicKey,
            //         mint,
            //         tokenAccount,
            //         receiverAccount,
            //         systemProgram: web3.SystemProgram.programId,
            //         tokenProgram: TOKEN_PROGRAM_ID,
            //     }
            // })
        }catch(e){
            console.log(e)
        }
    }

    const unstakeNft = async (mintAsString) => {
        let mint = new PublicKey(mintAsString)
        try {
            const provider = getProvider()
            const program = new Program(idl_obj, programId, provider)

            const [escrow, escrowBump] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode('escrow'), 
                provider.wallet.publicKey?.toBuffer(),
                mint?.toBuffer()
            ],  program.programId)

            const [token_auth, bump] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode('tokenauthority'), 
            ],  program.programId)


            const receiverAccount = (await getAtaForMint(mint, provider.wallet.publicKey))[0]
            const tokenAccount = (await getAtaForMint(mint, token_auth))[0]


            const accInfo = await connection.getAccountInfo(receiverAccount)
            const instrs = []
            if(!accInfo) {
                const instr = await createAssociatedTokenAccountInstruction(provider.wallet.publicKey, receiverAccount, program.programId, mint)
                instrs.push(instr)
            }


            console.log({tokenAccount: tokenAccount?.toBase58()})
            console.log({bump: bump})
            console.log({escrow: escrow?.toBase58()})
            console.log({receiverAccount: receiverAccount?.toBase58()})
            console.log({mint: mint?.toBase58()})
            console.log({escrowBump})

            const instr2 = await program.methods
        .unstake()
        .accountsStrict({
            escrow,
            user: provider.wallet.publicKey,
            mint,
            tokenAccount,
            receiverAccount,
            authority: token_auth, /*program.programId*/
            systemProgram: web3.SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID
        })
        .signers([]) // add your account
        .instruction()

        instrs.push(instr2)

        const transaction = new Transaction()

        transaction.add(...instrs)
    
        transaction.recentBlockhash = (
            await program.provider.connection.getLatestBlockhash('finalized')
        )?.blockhash
        transaction.feePayer = new PublicKey(provider.wallet.publicKey)

        // const signedTx = await provider.wallet.signTransaction(transaction)

        const tx = await ourWallet.sendTransaction(transaction, provider.connection, {skipPreflight: true})

        console.log({tx})

            // const data = await program.rpc.stake({
            //     accounts: {
            //         escrow,
            //         user: provider.wallet.publicKey,
            //         mint,
            //         tokenAccount,
            //         receiverAccount,
            //         systemProgram: web3.SystemProgram.programId,
            //         tokenProgram: TOKEN_PROGRAM_ID,
            //     }
            // })
        }catch(e){
            console.log(e)
        }
    }

    const getStakeAccounts = async () => {
        try {
            const provider = getProvider()
            const program = new Program(idl_obj, programId, provider)

            let accounts = await connection.getProgramAccounts(programId)
            const banksLocal = []
            for (let i = 0; i < accounts.length; i++) {
                try {
                const d = await program.account.escrowStake.fetch(accounts[i].pubkey)
                banksLocal.push({
                    ...d,
                    pubkey: accounts[i].pubkey
                })
            }catch{
                // go next
            }
        }

            setBanks([...banksLocal])
            
        }catch(e){
            console.log(e)
        }
    }

    const deposit = async (bank: string) => {
        try {
            const provider = getProvider()
            const program = new Program(idl_obj, programId, provider)


            // const [bank] = await PublicKey.findProgramAddressSync([
            //     utils.bytes.utf8.encode('bankaccount'), 
            //     provider.wallet.publicKey?.toBuffer()
            // ],  program.programId)



            const data = await program.rpc.deposit(new BN(0.1 * LAMPORTS_PER_SOL), {
                accounts: {
                    bank: new PublicKey(bank),
                    user: provider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId
                }
            })
            console.log(data)
        }catch(e){
            console.log(e)
        }
    }

    const withdraw = async (bank, amount) => {
        try {
            const provider = getProvider()
            const program = new Program(idl_obj, programId, provider)

            // const [bank] = await PublicKey.findProgramAddressSync([
            //     utils.bytes.utf8.encode('bankaccount'), 
            //     provider.wallet.publicKey?.toBuffer()
            // ],  program.programId)



            const data = await program.rpc.withdraw(new BN(amount), {
                accounts: {
                    bank,
                    user: provider.wallet.publicKey,
                }
            })
            console.log(data)
        }catch(e){
            console.log(e)
        }
    }


   

    return (
        <>
        <div className="flex flex-row justify-center">
            <div className="relative group items-center">
                <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={stakeNFT} disabled={!ourWallet?.publicKey}
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>
                    <span className="block group-disabled:hidden" > 
                        Stake nft
                    </span>
                </button>
                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={getStakeAccounts} disabled={!ourWallet?.publicKey}
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>
                    <span className="block group-disabled:hidden" > 
                        fetch banks 
                    </span>
                </button>

            </div>
            
        </div>
        <div className="flex columns justify-center">
                    {banks.map((it, index) => <div key={index + 'asd'}>
                        <div>stakedAt: {new Date(it?.stakedAt?.toNumber() * 1000)?.toString()}</div>
                        <div>lastClaimedAt: {it?.lastClaimedAt?.toString()}</div>
                        <div>totalClaimed: {it?.totalClaimed?.toString()}</div>
                        <div>mint: {it?.mint?.toString()}</div>
                        <div>owner: {it?.owner?.toString()}</div>
                    <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={() => deposit(it.pubkey?.toString())} disabled={!ourWallet?.publicKey}
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>
                    <span className="block group-disabled:hidden" > 
                        Claim rewards
                    </span>
                </button>

                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={() => unstakeNft(it.mint)} disabled={ourWallet?.publicKey?.toBase58() !== it.owner?.toString()}
                >
                    <div className="hidden group-disabled:block">
                        NOT ALLOWED TO UNSTAKE
                    </div>
                    <span className="block group-disabled:hidden" > 
                        UNSTAKE NFT
                    </span>
                </button>
                        </div>)
}
                        </div>
        </>
    );
};
