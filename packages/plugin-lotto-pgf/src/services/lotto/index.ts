export interface LotteryConfig {
    name: string;
    symbol: string;
    pickLength: number;
    maxBallValue: number;
    gamePeriod: number;
    ticketPrice: string;
    communityFeeBps: number;
    prizeToken: string;
    randomiser: string;
    seedJackpotDelay: number;
    seedJackpotMinValue: number;
    ticketSVGRenderer: string;
}

// In createLottery, update both simulateContract and write.init args:
const initArgs = {
    owner: walletClient.account.address,
    name: config.name,
    symbol: config.symbol,
    pickLength: config.pickLength,
    maxBallValue: config.maxBallValue,
    gamePeriod: BigInt(config.gamePeriod),
    ticketPrice: parseEther(config.ticketPrice),
    communityFeeBps: BigInt(config.communityFeeBps),
    randomiser: config.randomiser as `0x${string}`,
    prizeToken: config.prizeToken as `0x${string}`,
    seedJackpotDelay: BigInt(config.seedJackpotDelay),
    seedJackpotMinValue: BigInt(config.seedJackpotMinValue),
    ticketSVGRenderer: config.ticketSVGRenderer as `0x${string}`,
};

await publicClient.simulateContract({
    // ...other params
    args: [initArgs],
});

const hash = await factory.write.init([initArgs]);
