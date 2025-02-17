import models from "./models.ts";
import { IAgentRuntime, ModelProvider } from "./types.ts";

/**
 * Send a message to the OpenAI API for embedding.
 * @param input The input to be embedded.
 * @returns The embedding of the input.
 */
export async function embed(runtime: IAgentRuntime, input: string) {
    // get the charcter, and handle by model type
    const model = models[runtime.character.settings.model];

    if (model !== ModelProvider.OPENAI && model !== ModelProvider.OLLAMA) {
        return await runtime.llamaService.getEmbeddingResponse(input);
        //ollama supports embedding api so just use that
    }

    const embeddingModel = models[runtime.modelProvider].model.embedding;

    // Check if we already have the embedding in the lore
    const cachedEmbedding = await retrieveCachedEmbedding(runtime, input);
    if (cachedEmbedding) {
        return cachedEmbedding;
    }

    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            //Authorization: `Bearer ${runtime.token}`,
            ...(runtime.modelProvider !== ModelProvider.OLLAMA && { Authorization: `Bearer ${runtime.token}` }),
        },
        body: JSON.stringify({
            input,
            model: embeddingModel,
            length: 1536,
        }),
    };
    try {
        const response = await fetch(
            //`${runtime.serverUrl}/embeddings`,
            `${runtime.serverUrl}${runtime.modelProvider === ModelProvider.OLLAMA ? '/v1' : ''}/embeddings`,
            requestOptions
        );

        if (!response.ok) {
            throw new Error(
                "OpenAI API Error: " +
                    response.status +
                    " " +
                    response.statusText
            );
        }

        interface OpenAIEmbeddingResponse {
            data: Array<{ embedding: number[] }>;
        }

        const data: OpenAIEmbeddingResponse = await response.json();

        return data?.data?.[0].embedding;
    } catch (e) {
        console.error(e);
        throw e;
    }
}

export async function retrieveCachedEmbedding(
    runtime: IAgentRuntime,
    input: string
) {
    const similaritySearchResult =
        await runtime.messageManager.getCachedEmbeddings(input);
    if (similaritySearchResult.length > 0) {
        return similaritySearchResult[0].embedding;
    }
    return null;
}
