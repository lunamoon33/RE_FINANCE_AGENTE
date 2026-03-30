import solc from 'solc';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const sourceCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReFinanceScores {
    mapping(address => uint8) public userScores;
    
    function publishScore(address userWallet, uint8 score) public {
        userScores[userWallet] = score;
    }
}
`;

async function main() {
    console.log("🛠️  Compilando contrato inteligente...");
    const input = {
        language: 'Solidity',
        sources: { 'ReFinanceScores.sol': { content: sourceCode } },
        settings: { outputSelection: { '*': { '*': ['*'] } } }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    
    if (output.errors && output.errors.filter(e => e.severity === 'error').length > 0) {
        console.error("❌ Error de compilación:", output.errors);
        return;
    }

    const contract = output.contracts['ReFinanceScores.sol']['ReFinanceScores'];
    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;

    console.log("🔌 Conectando a Rollux Testnet...");
    const rpcUrl = process.env.ROLLUX_RPC_URL || "https://rpc.tanenbaum.io";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    if (!process.env.ADMIN_PRIVATE_KEY || process.env.ADMIN_PRIVATE_KEY === "Tu_Clave_Privada_Aqui") {
        console.error("❌ ERROR: Debes poner tu Clave Privada real en ADMIN_PRIVATE_KEY dentro del archivo .env");
        return;
    }

    try {
        const wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
        console.log(`✅ Conectado con la Billetera: ${wallet.address}`);

        console.log("🚀 Desplegando Contrato en la Blockchain... (Esto tomará unos segundos)");
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        const deployedContract = await factory.deploy();
        
        await deployedContract.waitForDeployment();
        const address = await deployedContract.getAddress();

        console.log("\n==========================================");
        console.log("🎉 ¡CONTRATO DESPLEGADO CON ÉXITO!");
        console.log("📜 Dirección del Contrato (Cópiala a tu .env en CONTRACT_ADDRESS):");
        console.log(`👉  ${address}`);
        console.log("==========================================\n");
    } catch (e) {
        console.error("❌ Error al desplegar:", e.message);
    }
}

main().catch(console.error);
