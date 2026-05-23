import type { ToolDefinition } from "@/lib/types";
import { generateImage } from "@/lib/nvidia/client";
import { sendImage } from "@/lib/facebook/messenger";
import type { AIModel } from "@/lib/types";

export const imageTool: ToolDefinition = {
  name: "generate_image",
  description:
    "Generate an AI image from a text prompt. Args: prompt (string) describing the image, model (optional: 'sdxl' or 'flux').",
  parameters: {
    type: "object",
    properties: {
      prompt: {
        type: "string",
        description: "The image prompt describing what to generate",
      },
      model: {
        type: "string",
        enum: ["sdxl", "flux"],
        description: "The AI model to use for generation. Default: sdxl",
      },
    },
    required: ["prompt"],
  },
  execute: async (args, context) => {
    const prompt = (args.prompt as string) || "";
    if (!prompt) return "Please provide a prompt for image generation.";

    const model = ((args.model as string) || "sdxl") as AIModel;

    try {
      const imageUrl = await generateImage(prompt, model);

      if (imageUrl) {
        // Send the image directly; return the URL as a fallback
        try {
          await sendImage(context.psid, imageUrl);
          return `🖼️ Image generated: "${prompt}"`;
        } catch {
          return `🖼️ Image generated: ${imageUrl}`;
        }
      }

      return "Image generation succeeded but no image URL was returned.";
    } catch (error) {
      return `Image generation failed: ${error instanceof Error ? error.message : "Unknown error"}. Try a different prompt.`;
    }
  },
};