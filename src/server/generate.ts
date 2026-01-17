import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import fetch from 'node-fetch';

// Inside generate.tsx

const getSupabase = () => {
    // Check if we are on the server and have the service key
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }
    // Fallback (or keep your original return)
    return createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!
    );
}

const GeneratePostSchema = z.object({
    prompt: z.string(),
    platform: z.string(),
})

const SavePostSchema = z.object({
    prompt: z.string(),
    platform: z.string(),
    content: z.string(),
    image_url: z.string(),
})

interface OpenRouterResponse {
    choices: {
        message: {
            content: string;
        };
    }[];
}

export const generatePostFn = createServerFn({ method: 'POST' })
    .inputValidator(GeneratePostSchema)
    .handler(async ({ data }: { data: z.infer<typeof GeneratePostSchema> }) => {
        const { prompt, platform } = data;

        // Get OpenRouter API key
        const apiKey = "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";
        if (!apiKey) throw new Error("OPEN_ROUTER_KEY is not set");

        // 1. Generate Text using OpenRouter
        const textPrompt = `Write a creative and engaging social media post for ${platform}. 
    Topic: ${prompt}.
    Include a few hashtags. return ONLY the text content.`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3002',
                'X-Title': 'Social Media Post Generator'
            },
            body: JSON.stringify({
                model: 'mistralai/devstral-2512:free',
                messages: [
                    {
                        role: 'user',
                        content: textPrompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API Error:', errorText);
            throw new Error(`OpenRouter API failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as OpenRouterResponse;

        if (!result.choices || !result.choices[0] || !result.choices[0].message) {
            console.error('Invalid OpenRouter API response format');
            throw new Error('Failed to generate content due to invalid API response');
        }

        const generatedText = result.choices[0]?.message?.content || 'Failed to generate content';

        // Return just the content - image will be generated on client
        return { content: generatedText };
    });

export const generateAndUploadImageFn = createServerFn({ method: 'POST' })
    .inputValidator(GeneratePostSchema)
    .handler(async ({ data }: { data: z.infer<typeof GeneratePostSchema> }) => {
        const { prompt, platform } = data;
        const supabase = getSupabase();

        const imagePrompt = encodeURIComponent(`Professional ${platform} social media image about: ${prompt}`);
        const seed = Math.floor(Math.random() * 999999);
        const pollutionsUrl = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;

        const response = await fetch(pollutionsUrl);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileName = `post-images/${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, buffer, {
                contentType: 'image/png',
            });

        if (uploadError) {
            console.error('Supabase Storage Error:', uploadError);
            throw new Error('Failed to upload image to Supabase Storage');
        }

        const { data: publicUrlData } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);

        return { imageUrl: publicUrlData.publicUrl };
    });


export const savePostFn = createServerFn({ method: 'POST' })
    .inputValidator(SavePostSchema)
    .handler(async ({ data }: { data: z.infer<typeof SavePostSchema> }) => {
        const { prompt, platform, content, image_url } = data;
        const supabase = getSupabase();

        // Save to Supabase
        const { data: savedPost, error } = await supabase
            .from('posts')
            .insert({
                prompt,
                platform,
                content,
                image_url
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase Error:", error);
            throw new Error("Failed to save post");
        }

        return savedPost;
    });
