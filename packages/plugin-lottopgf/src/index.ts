import { Plugin } from "@ai16z/eliza";
import { noneAction } from "./actions/lotto.ts";
import { pgfEvaluator } from "./evaluators/pgf.ts";
import { pgfProvider } from "./providers/pgf.ts";

export * as actions from "./actions/index.ts";
export * as evaluators from "./evaluators/index.ts";
export * as providers from "./providers/index.ts";

export const lottopgfPlugin: Plugin = {
    name: "lottopgf",
    description: "LottoPGF plugin for Agents",
    actions: [noneAction],
    evaluators: [pgfEvaluator],
    providers: [pgfProvider],
};
