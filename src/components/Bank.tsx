// TODO: SignMessage
import { verify } from '@noble/ed25519';
import { AnchorProvider, BN, Program, utils, web3 } from '@project-serum/anchor';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { FC, useCallback, useEffect, useState } from 'react';
import { notify } from "../utils/notifications";
import idl from './idl.json'

const idl_obj = JSON.parse(JSON.stringify(idl))
const programId = new PublicKey(idl.metadata.address)

export const SignMessage: FC = () => {
    const ourWallet = useWallet();
    const {connection} = useConnection()

    const [banks, setBanks] = useState([])

    useEffect(()=> {
        getBanks()
    }, [])

    const getProvider = () => new AnchorProvider(connection, ourWallet, AnchorProvider.defaultOptions())

    const createBank = async () => {
        try {
            const provider = getProvider()
            const program = new Program(idl_obj, programId, provider)

            const [bank] = await PublicKey.findProgramAddressSync([
                utils.bytes.utf8.encode('bankaccount'), 
                provider.wallet.publicKey?.toBuffer()
            ],  program.programId)



            const data = await program.rpc.create("First bank", {
                accounts: {
                    bank,
                    user: provider.wallet.publicKey,
                    systemProgram: web3.SystemProgram.programId
                }
            })
            console.log(data)
        }catch(e){
            console.log(e)
        }
    }

    const getBanks = async () => {
        try {
            const provider = getProvider()
            const program = new Program(idl_obj, programId, provider)

            const accounts = await connection.getProgramAccounts(programId)
            const banksLocal = []
            for (let i = 0; i < accounts.length; i++) {
                const d = await program.account.bank.fetch(accounts[i].pubkey)
                banksLocal.push({
                    ...d,
                    pubkey: accounts[i].pubkey
                })
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
                    onClick={createBank} disabled={!ourWallet?.publicKey}
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>
                    <span className="block group-disabled:hidden" > 
                        Create bank 
                    </span>
                </button>
                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={getBanks} disabled={!ourWallet?.publicKey}
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
                        <div>{it?.name}</div>
                        <div>{it?.balance / LAMPORTS_PER_SOL} SOL</div>
                    <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={() => deposit(it.pubkey?.toString())} disabled={!ourWallet?.publicKey}
                >
                    <div className="hidden group-disabled:block">
                        Wallet not connected
                    </div>
                    <span className="block group-disabled:hidden" > 
                        deposit 0.1 SOL
                    </span>
                </button>

                <button
                    className="group w-60 m-2 btn animate-pulse bg-gradient-to-br from-indigo-500 to-fuchsia-500 hover:from-white hover:to-purple-300 text-black"
                    onClick={() => withdraw(it.pubkey, it.balance)} disabled={ourWallet?.publicKey?.toBase58() !== it.owner?.toString()}
                >
                    <div className="hidden group-disabled:block">
                        NOT ALLOWED TO WITHDRAW
                    </div>
                    <span className="block group-disabled:hidden" > 
                        withdraw all
                    </span>
                </button>
                        </div>)
}
                        </div>
        </>
    );
};
