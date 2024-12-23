import {
    createPublicClient,
    createWalletClient,
    http,
    parseEther,
    formatEther,
    Address,
    getContract,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, scroll } from "viem/chains";
import { LooteryABI } from "../../lib/LooteryABI";

// Initialize clients based on environment
const getClients = (chainId: number = 8453) => {
    // Default to Base
    const chain = chainId === 8453 ? base : scroll;
    const rpcUrl =
        chainId === 8453
            ? process.env.BASE_RPC_URL
            : process.env.SCROLL_RPC_URL;

    const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
    });

    const privateKey = process.env.EVM_PRIVATE_KEY;
    if (!privateKey)
        throw new Error("EVM_PRIVATE_KEY not found in environment");

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    const walletClient = createWalletClient({
        chain,
        transport: http(rpcUrl),
        account,
    });

    return { publicClient, walletClient };
};

// Contract interaction functions
export interface LotteryConfig {
    name: string;
    symbol: string;
    pickLength: number;
    maxBallValue: number;
    gamePeriod: number;
    ticketPrice: string;
    communityFeeBps: number;
    prizeToken: string;
    beneficiaries: Array<{
        address: string;
        displayName: string;
    }>;
}

export interface TicketPurchase {
    lotteryAddress: string;
    picks: number[][];
    beneficiary?: string;
    quantity: number;
}

export interface LotterySearchParams {
    status?: "active" | "ended";
    minJackpot?: string;
    beneficiary?: string;
    prizeToken?: string;
}

export const lotteryServices = {
    // Create new lottery
    createLottery: async (config: LotteryConfig, chainId: number = 8453) => {
        const { walletClient, publicClient } = getClients(chainId);
        const factoryAddress =
            chainId === 8453
                ? process.env.BASE_LOOTERY_ADDRESS
                : process.env.SCROLL_LOOTERY_ADDRESS;

        if (!factoryAddress) throw new Error("Factory address not configured");

        const factory = getContract({
            address: factoryAddress as `0x${string}`,
            abi: LooteryABI,
        });

        // Simulate transaction first
        await publicClient.simulateContract({
            address: factoryAddress as `0x${string}`,
            abi: LooteryABI,
            functionName: "init",
            args: [
                {
                    owner: walletClient.account.address,
                    name: config.name,
                    symbol: config.symbol,
                    pickLength: config.pickLength,
                    maxBallValue: config.maxBallValue,
                    gamePeriod: parseEther(config.gamePeriod.toString()),
                    ticketPrice: parseEther(config.ticketPrice),
                    communityFeeBps: parseEther(
                        config.communityFeeBps.toString()
                    ),
                    prizeToken: config.prizeToken as `0x${string}`,
                    randomiser: "0xYourRandomiserAddress" as `0x${string}`,
                    seedJackpotDelay: BigInt(86400), // 1 day in seconds
                    seedJackpotMinValue: parseEther("0.1"),
                    ticketSVGRenderer: "0xYourRendererAddress" as `0x${string}`,
                },
            ],
            account: walletClient.account,
        });

        // Execute transaction
        const hash = await factory.write.init([
            {
                owner: walletClient.account.address,
                name: config.name,
                symbol: config.symbol,
                pickLength: config.pickLength,
                maxBallValue: config.maxBallValue,
                gamePeriod: config.gamePeriod,
                ticketPrice: parseEther(config.ticketPrice),
                communityFeeBps: config.communityFeeBps,
                prizeToken: config.prizeToken as `0x${string}`,
                beneficiaries: config.beneficiaries.map((b) => ({
                    address: b.address,
                    displayName: b.displayName,
                })),
            },
        ]);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return receipt;
    },

    // Buy lottery tickets
    buyTickets: async (purchase: TicketPurchase, chainId: number = 8453) => {
        const { walletClient, publicClient } = getClients(chainId);

        const lottery = getContract({
            address: purchase.lotteryAddress as `0x${string}`,
            abi: LooteryABI,
            publicClient,
            walletClient,
        });

        // Get ticket price
        const ticketPrice = await lottery.read.ticketPrice();
        const totalCost = ticketPrice * BigInt(purchase.quantity);

        // Format tickets for contract
        const tickets = purchase.picks.map((pick) => ({
            whomst: walletClient.account.address,
            pick,
        }));

        // Simulate transaction
        await publicClient.simulateContract({
            address: purchase.lotteryAddress as `0x${string}`,
            abi: LooteryABI,
            functionName: "purchase",
            args: [
                tickets,
                purchase.beneficiary || walletClient.account.address,
            ],
            value: totalCost,
            account: walletClient.account,
        });

        // Execute transaction
        const hash = await lottery.write.purchase(
            [tickets, purchase.beneficiary || walletClient.account.address],
            { value: totalCost }
        );

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return receipt;
    },

    // Search lotteries
    searchLotteries: async (
        params: LotterySearchParams,
        chainId: number = 8453
    ) => {
        const { publicClient } = getClients(chainId);
        const factoryAddress =
            chainId === 8453
                ? process.env.BASE_FACTORY_ADDRESS
                : process.env.SCROLL_FACTORY_ADDRESS;

        if (!factoryAddress) throw new Error("Factory address not configured");

        // Get lottery created events
        const filter = await publicClient.createContractEventFilter({
            address: factoryAddress as `0x${string}`,
            abi: LooteryABI,
            eventName: "LotteryCreated",
            fromBlock: "earliest",
        });

        const events = await publicClient.getFilterLogs({ filter });

        // Get details for each lottery
        const lotteries = await Promise.all(
            events.map(async (event) => {
                const lotteryAddress = event.args.lottery as Address;
                const lottery = getContract({
                    address: lotteryAddress,
                    abi: LooteryABI,
                    publicClient,
                });

                const [
                    name,
                    currentJackpot,
                    ticketPrice,
                    isActive,
                    beneficiaries,
                ] = await Promise.all([
                    lottery.read.name(),
                    lottery.read.jackpot(),
                    lottery.read.ticketPrice(),
                    lottery.read.isGameActive(),
                    lottery.read.beneficiaries(),
                ]);

                return {
                    address: lotteryAddress,
                    name,
                    currentJackpot: formatEther(currentJackpot),
                    ticketPrice: formatEther(ticketPrice),
                    status: isActive ? "active" : "ended",
                    beneficiaries: beneficiaries,
                };
            })
        );

        // Apply filters
        return lotteries.filter((lottery) => {
            if (params.status && lottery.status !== params.status) return false;
            if (
                params.minJackpot &&
                Number(lottery.currentJackpot) < Number(params.minJackpot)
            )
                return false;
            if (
                params.beneficiary &&
                !lottery.beneficiaries[0].includes(params.beneficiary)
            )
                return false;
            return true;
        });
    },

    // Fund lottery
    fundLottery: async (
        lotteryAddress: string,
        amount: string,
        chainId: number = 8453
    ) => {
        const { walletClient, publicClient } = getClients(chainId);

        const lottery = getContract({
            address: lotteryAddress as `0x${string}`,
            abi: LooteryABI,
            publicClient,
            walletClient,
        });

        // Simulate transaction
        await publicClient.simulateContract({
            address: lotteryAddress as `0x${string}`,
            abi: LooteryABI,
            functionName: "seedJackpot",
            args: [parseEther(amount)],
            account: walletClient.account,
        });

        // Execute transaction
        const hash = await lottery.write.seedJackpot([parseEther(amount)]);
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return receipt;
    },

    // Get lottery status
    getLotteryStatus: async (
        lotteryAddress: string,
        chainId: number = 8453
    ) => {
        const { publicClient } = getClients(chainId);

        const lottery = getContract({
            address: lotteryAddress as `0x${string}`,
            abi: LooteryABI,
            publicClient,
        });

        const [currentGame, jackpot, ticketPrice, totalSupply, gameData] =
            await Promise.all([
                lottery.read.currentGame(),
                lottery.read.jackpot(),
                lottery.read.ticketPrice(),
                lottery.read.totalSupply(),
                lottery.read.gameData([0]), // Current game
            ]);

        return {
            status: currentGame.state,
            gameId: Number(currentGame.id),
            jackpot: formatEther(jackpot),
            ticketPrice: formatEther(ticketPrice),
            totalTickets: Number(totalSupply),
            ticketsSold: Number(gameData.ticketsSold),
            startedAt: new Date(Number(gameData.startedAt) * 1000),
            winningPickId: gameData.winningPickId
                ? Number(gameData.winningPickId)
                : null,
        };
    },
};
