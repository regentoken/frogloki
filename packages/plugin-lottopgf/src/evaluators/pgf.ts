import { composeContext } from "@ai16z/eliza";
import { generateObjectArray } from "@ai16z/eliza";
import { MemoryManager } from "@ai16z/eliza";
import {
    ActionExample,
    IAgentRuntime,
    Memory,
    ModelClass,
    Evaluator,
} from "@ai16z/eliza";

export const formatFacts = (facts: Memory[]) => {
    const messageStrings = facts
        .reverse()
        .map((fact: Memory) => fact.content.text);
    const finalMessageStrings = messageStrings.join("\n");
    return finalMessageStrings;
};

const pgfTemplate =
    // {{actors}}
    `TASK: Extract Claims about public goods projects mentioned in the conversation as an array of claims in JSON format.

# START OF EXAMPLES
These are examples of the expected output of this task:
[
  {"claim": "knows about Public Goods project called Protocol Guild", "type": "fact", "in_bio": false, "already_known": false},
  {"claim": "knows about Public Goods project called Giveth", "type": "fact", "in_bio": false, "already_known": false},
  {"claim": "knows about Public Goods project called Optimism RetroPGF", "type": "fact", "in_bio": false, "already_known": false}
]
# END OF EXAMPLES

# INSTRUCTIONS

Extract any mentions of public goods projects from the conversation:
- The claim should be in the format "knows about Public Goods project called {{projectName}}"
- Try not to include already-known projects. If you think a project is already known, but you're not sure, respond with already_known: true
- If the project is already in the user's description, set in_bio to true
- If we've already extracted this project, set already_known to true
- Set the claim type to 'fact' since knowledge of a project's existence is a factual statement
- Include any public goods project mentioned, including protocols, DAOs, funding mechanisms, and infrastructure projects

Recent Messages:
{{recentMessages}}

Response should be a JSON object array inside a JSON markdown block. Correct response format:
\`\`\`json
[
  {"claim": string, "type": "fact", "in_bio": boolean, "already_known": boolean},
  {"claim": string, "type": "fact", "in_bio": boolean, "already_known": boolean},
  ...
]
\`\`\``;

async function handler(runtime: IAgentRuntime, message: Memory) {
    console.log("A HUEVO HANDLER!!!");
    const state = await runtime.composeState(message);

    const { agentId, roomId } = state;

    const context = composeContext({
        state,
        template: pgfTemplate,
    });

    const facts = await generateObjectArray({
        runtime,
        context,
        modelClass: ModelClass.LARGE,
    });

    const factsManager = new MemoryManager({
        runtime,
        tableName: "facts",
    });

    if (!facts) {
        return [];
    }

    // If the fact is known or corrupted, remove it
    const filteredFacts = facts
        .filter((fact) => {
            return (
                !fact.already_known &&
                fact.type === "fact" &&
                !fact.in_bio &&
                fact.claim &&
                fact.claim.trim() !== ""
            );
        })
        .map((fact) => fact.claim);

    for (const fact of filteredFacts) {
        const factMemory = await factsManager.addEmbeddingToMemory({
            userId: agentId!,
            agentId,
            content: { text: fact },
            roomId,
            createdAt: Date.now(),
        });

        await factsManager.createMemory(factMemory, true);

        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return filteredFacts;
}
export const pgfEvaluator: Evaluator = {
    name: "EVALUATE_PUBLIC_GOODS",
    similes: [
        "CHECK_PUBLIC_GOODS",
        "ANALYZE_PROJECT",
        "EVALUATE_PROJECT",
        "CHECK_PROJECT",
        "ASSESS_PUBLIC_GOOD",
    ],
    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        const messageCount = (await runtime.messageManager.countMemories(
            message.roomId
        )) as number;

        const reflectionCount = Math.ceil(runtime.getConversationLength() / 2);

        return messageCount % reflectionCount === 0;
    },
    description:
        "Evaluate whether mentioned projects qualify as public goods by analyzing their characteristics and impact.",
    handler,
    examples: [
        {
            context:
                "Discussion about criteria for public goods and evaluating projects",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "What makes something a public good? I heard {{project}} being called one.",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Public goods have two key characteristics: they must be non-rivalrous (one person's use doesn't reduce availability for others) and non-excludable (you can't prevent people from accessing it). While {{project}} is valuable, it doesn't qualify as a true public good because it has excludable access - users need to pay fees and can be restricted from using it.",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "That makes sense. So even though it's useful, the ability to exclude users means it's not technically a public good?",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Exactly! {{project}} provides important services, but since access can be controlled and limited, it doesn't meet the core criteria of being non-excludable that defines a true public good.",
                    },
                },
            ] as ActionExample[],
            outcome: `{ "claim": "{{project}} is not a Public Goods project", "type": "fact", "in_bio": false, "already_known": false },`,
        },
        {
            context:
                "Discussion about criteria for public goods and evaluating projects",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "What makes something a public good? I heard {{project}} being called one.",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Public goods have two key characteristics: they must be non-rivalrous (one person's use doesn't reduce availability for others) and non-excludable (you can't prevent people from accessing it). {{project}} is a great example of a true public good because anyone can freely access and use it without reducing its availability to others.",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "So because no one can be prevented from using it, and it doesn't get 'used up', it's a public good?",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Exactly! {{project}} embodies both key criteria - it's non-excludable since anyone can access it, and non-rivalrous since one person's use doesn't diminish it for others. That's what makes it a true public good.",
                    },
                },
            ] as ActionExample[],
            outcome: `{ "claim": "{{project}} is a Public Goods project", "type": "fact", "in_bio": false, "already_known": false },`,
        },
        {
            context: "Discussion about different public goods funding projects",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "I've been researching different public goods projects lately. Have you heard about Giveth, LottoPGF, or Glo Dollar?",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "I know a bit about them! Tell me what you've learned.",
                    },
                },
                {
                    user: "{{user1}}",
                    content: {
                        text: "Well, Giveth is really cool because it's a completely permissionless crowdfunding platform - anyone can create or support projects without restrictions. LottoPGF has an interesting model where 50% of lottery earnings automatically go to fund public goods. And Glo Dollar directs all its profits to supporting public goods initiatives.",
                    },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Those are interesting approaches! Each one seems to have a different way of channeling resources to public goods.",
                    },
                },
            ] as ActionExample[],
            outcome: `[
  { "claim": "Giveth is a Public Goods project", "type": "fact", "in_bio": false, "already_known": false },
  { "claim": "LottoPGF is a Public Goods project", "type": "fact", "in_bio": false, "already_known": false },
  { "claim": "Glo Dollar is a Public Goods project", "type": "fact", "in_bio": false, "already_known": false }
]`,
        },
        {
            context:
                "Conversation about blockchain projects and their public good status",
            messages: [
                {
                    user: "{{user1}}",
                    content: { text: "What do you think about Ethereum?" },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Ethereum is a fundamental public good - it provides open, permissionless infrastructure that anyone can build on and use.",
                    },
                },
            ],
            outcome: `[
                { "claim": "{{user2}} knows about Public Goods project called Ethereum", "type": "fact", "in_bio": false, "already_known": false },
                { "claim": "Ethereum is a Public Goods project", "type": "fact", "in_bio": false, "already_known": false }
            ]
        `,
        },
        {
            context: "Discussion about funding mechanisms",
            messages: [
                {
                    user: "{{user1}}",
                    content: { text: "Have you heard about Gitcoin Grants?" },
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "Yes! Gitcoin Grants is itself a public good, helping fund other public goods through quadratic funding.",
                    },
                },
            ],
            outcome: `[
                { "claim": "{{user2}} knows about Public Goods project called Gitcoin Grants", "type": "fact", "in_bio": false, "already_known": false },
                { "claim": "Gitcoin Grants is a Public Goods project", "type": "fact", "in_bio": false, "already_known": false }
                ]`,
        },
    ],
};
