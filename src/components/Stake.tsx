// TODO: SignMessage
import { AnchorProvider, Program, utils, web3 } from '@project-serum/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { FC, useEffect, useState } from 'react';
import idl from './idl.json';

const idl_obj = JSON.parse(JSON.stringify(idl))
const programId = new PublicKey(idl.metadata.address)
/**
 *   "metadata": {
    "address": "ByKpVE7PmU4oQwoJLfMcD9CqFkDXRhsZkq3X4xfNUQ3P"
  }
 */

export const trimAddress = (address: string, remainingChars = 4) => {
    if (!address || address.length <= 30) {
        if (address === '') return '-'
        return address
    }

    return (
        address.substring(0, remainingChars) +
        '...' +
        address.substring(address.length - remainingChars, address.length)
    )
}
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
    const [mints, setMints] = useState([])

    useEffect(()=> {
        getStakeAccounts()
    }, [])


    const getNftsForAccount = async (pubkey: string) => {
        const data: any[] = await fetch(`https://api-devnet.magiceden.dev/v2/wallets/${pubkey}/tokens?offset=0&limit=100&listStatus=both`)?.then(it => it?.json())
        if (data) {
            setMints(data?.filter(it => it?.image?.startsWith('http'))?.filter(it => {
                const alreadyStaked = !!banks?.find(item => item.mint === it.mintAddress)

                return !alreadyStaked

            }) )
        }
    }

    useEffect(() => {
        if (ourWallet.publicKey) {
            getNftsForAccount(ourWallet.publicKey?.toBase58())
        }
    }, [ourWallet.publicKey, banks])



    const getProvider = () => new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())

    const stakeNFT = async (mintAsStr) => {
        let mint = new PublicKey(mintAsStr)
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

        }catch(e){
            console.log(e)
        }
    }


    const unstakeNft = async (mintAsString) => {
        let mint = new PublicKey(mintAsString)
        try {
            const provider = getProvider()
            const program = new Program(idl_obj, programId, provider)

            const reward_mint = new PublicKey('DoRqnUJcuXUKmurDF8t9kRYQLTJ4gRbjXFqVtmVg9vDi')

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

            const reward_user_tokenAccount = (await getAtaForMint(reward_mint, provider.wallet.publicKey))[0]
            const reward_vault_tokenAccount = (await getAtaForMint(reward_mint, token_auth))[0]


            const accInfo = await connection.getAccountInfo(receiverAccount)
            const instrs = []
            if(!accInfo) {
                const instr = await createAssociatedTokenAccountInstruction(provider.wallet.publicKey, receiverAccount, program.programId, mint)
                instrs.push(instr)
            }

            const accInfo2 = await connection.getAccountInfo(reward_user_tokenAccount)
            if(!accInfo2) {
                const instr = await createAssociatedTokenAccountInstruction(provider.wallet.publicKey, reward_user_tokenAccount, provider.wallet.publicKey, reward_mint)
                instrs.push(instr)
            }

            const instr2 = await program.methods
        .unstake()
        .accountsStrict({
            escrow,
            user: provider.wallet.publicKey,
            mint,
            tokenAccount,
            receiverAccount,
            rewardVaultAcc: reward_vault_tokenAccount,
            rewardUserAcc: reward_user_tokenAccount,
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
        }catch(e){
            console.log(e)
        }
    }

    const claimRewad = async (mintAsString) => {
        let mint = new PublicKey(mintAsString)
        try {
            const provider = getProvider()
            const program = new Program(idl_obj, programId, provider)

            const reward_mint = new PublicKey('DoRqnUJcuXUKmurDF8t9kRYQLTJ4gRbjXFqVtmVg9vDi')

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

            const reward_user_tokenAccount = (await getAtaForMint(reward_mint, provider.wallet.publicKey))[0]
            const reward_vault_tokenAccount = (await getAtaForMint(reward_mint, token_auth))[0]


            const instrs = []


            const accInfo2 = await connection.getAccountInfo(reward_user_tokenAccount)
            if(!accInfo2) {
                const instr = await createAssociatedTokenAccountInstruction(provider.wallet.publicKey, reward_user_tokenAccount, provider.wallet.publicKey, reward_mint)
                instrs.push(instr)
            }


            const instr2 = await program.methods
        .claim()
        .accountsStrict({
            escrow,
            user: provider.wallet.publicKey,
            mint,
            rewardVaultAcc: reward_vault_tokenAccount,
            rewardUserAcc: reward_user_tokenAccount,
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
                const d: any = await program.account.escrowStake.fetch(accounts[i].pubkey)

                let mintData = {}

                try {
                    const data = await fetch(`https://api-devnet.magiceden.dev/v2/tokens/${d?.mint?.toString()}`)?.then(it => it?.json())
                    mintData = {
                        ...data
                    }
                }catch(e){
                    //
                }


                banksLocal.push({
                    lastClaimedAt: d?.lastClaimedAt?.toString(),
                    stakedAt: d?.stakedAt?.toString(),
                    totalClaimed: d?.totalClaimed?.toString(),
                    mint: d?.mint?.toString(),
                    owner: d?.owner?.toString(),
                    pubkey: accounts[i].pubkey,
                    mintData
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



    if (!ourWallet?.publicKey) {
        return <>
        <div className="flex flex-row justify-center">
            <div className="relative group items-center">
                </div>
                Wallet not connected, please connect
                </div>
        </>
    }   

    return (
        <>
            My Nfts:

        <div style={{display: 'flex', flexWrap: 'wrap'}}>
                    {
                    mints?.map((it, index) => 
                    <div key={it.mintAddress + index} style={{margin: 20, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', flex: 1}}>
                            <img src={it.image} height={100} width={100} style={{alignSelf: 'center'}}/>
                        </div>
                        <div>{it.name}</div>
                        <div>{trimAddress(it?.mintAddress?.toString())}</div>
                <button
                    className="group w-30 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={() => stakeNFT(it?.mintAddress)} disabled={!ourWallet?.publicKey}
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>
                    <span className="block group-disabled:hidden" > 
                        Stake nft
                    </span>
                </button>
                    </div>)
                }
        </div>
        <div className="flex flex-row justify-center">
            <div className="relative group items-center">

                <div className="m-1 absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 
                rounded-lg blur opacity-20 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>    
                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={getStakeAccounts} disabled={!ourWallet?.publicKey}
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>
                    <span className="block group-disabled:hidden" > 
                        fetch staked NFTs 
                    </span>
                </button>

            </div>
            
        </div>
        <div className="flex columns justify-center" style={{flexWrap: 'wrap'}}>
            {!banks?.length && <div>Loading staked NFTs...</div> }
                    {banks.map((it, index) => <div key={index + 'asd'}>
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', flex: 1}}>
                            <img src={it.mintData.image} height={100} width={100}/>
                        </div>
                        <div style={{display: 'flex', flexDirection: 'column', alignContent: 'center', alignItems: 'center'}}>
                        <div>staked At: {new Date(it?.stakedAt * 1000)?.toLocaleString()}</div>
                        <div>last ClaimedAt: {it?.lastClaimedAt != '0' ? new Date(it?.lastClaimedAt * 1000)?.toLocaleString() : '-'}</div>
                        <div>total Claimed: {it?.totalClaimed / Math.pow(10,9)} COINS</div>
                        <div>mint: {trimAddress(it?.mint?.toString())}</div>
                        <div>owner: {trimAddress(it?.owner?.toString())}</div>
                        <div>name: {trimAddress(it?.mintData?.name?.toString())}</div>
                        </div>
                        <div  style={{display: 'flex', flexDirection: 'column', alignContent: 'center', alignItems: 'center', margin: 20}}>
                    <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={() => claimRewad(it?.mint?.toString())} disabled={ourWallet?.publicKey?.toBase58() !== it.owner?.toString()}
                >
                    <div className="hidden group-disabled:block">
                    NOT ALLOWED TO CLAIM
                    </div>
                    <span className="block group-disabled:hidden" > 
                        {'Claim rewards (~ ' + (it?.lastClaimedAt != '0' ? Math.round(new Date().getTime() / 1000 - it?.lastClaimedAt) : Math.round(new Date().getTime() / 1000 - it?.stakedAt) ) + ')'}
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
                </div>
                        </div>)
}
                        </div>
        </>
    );
};
