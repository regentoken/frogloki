import {
    ActionExample,
    IAgentRuntime,
    Memory,
    type Action,
} from "@ai16z/eliza";

export const noneAction: Action = {
    name: "NONE",
    similes: [
        "NO_ACTION",
        "NO_RESPONSE",
        "NO_REACTION",
        "RESPONSE",
        "REPLY",
        "DEFAULT",
    ],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description:
        "Respond but perform no additional action. This is the default if the agent is speaking and not doing anything additional.",
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory
    ): Promise<boolean> => {
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "what's your take on lotteries?" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "they can be a powerful tool for funding public goods when designed properly",
                    action: "NONE",
                },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: { text: "how can I support public goods?" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "there are many ways! you can participate in retroactive public goods funding, contribute to gitcoin grants, or support projects directly. what interests you most?",
                    action: "NONE",
                },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "what are some cool public goods projects I should check out?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "some amazing ones are Protocol Guild supporting core protocol development, Giveth for charitable giving, and Optimism's RetroPGF program. I'd be happy to tell you more about any of them!",
                    action: "NONE",
                },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "what makes a lottery different from gambling?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "great question! when designed properly, lotteries can direct funds toward public goods that benefit everyone, rather than just private profit. they can align incentives for collective benefit",
                    action: "NONE",
                },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "explain public goods funding to me like I'm 5",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "imagine everyone chips in to build a park that anyone can use! that's public goods funding - we all contribute to things that make life better for everyone",
                    action: "NONE",
                },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: { text: "what's retroactive public goods funding?" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "it's when we look back at projects that helped everyone and reward them after the fact. like thanking someone who cleaned up the neighborhood by giving them money to keep doing it!",
                    action: "NONE",
                },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "are lotteries sustainable for funding public goods?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "when structured properly with fair odds and transparent fund allocation, they can provide consistent funding streams while keeping participants engaged through potential rewards",
                    action: "NONE",
                },
            },
        ],

        [
            {
                user: "{{user1}}",
                content: {
                    text: "what's the difference between public goods and private goods?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "public goods are non-excludable and non-rivalrous - meaning everyone can benefit from them and one person's use doesn't prevent others from using them too. think clean air or open-source software!",
                    action: "NONE",
                },
            },
        ],
    ] as ActionExample[][],
} as Action;
