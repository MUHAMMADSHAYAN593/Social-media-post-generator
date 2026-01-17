import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import fetch from 'node-fetch';
import Groq from 'groq-sdk'; // Import Groq


// --- HELPER: SUPABASE CLIENT ---
const getSupabase = () => {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }
    return createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!
    );
}

// --- SCHEMAS ---
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

// --- 1. GENERATE TEXT (Using GROQ API) ---
export const generatePostFn = createServerFn({ method: 'POST' })
    .inputValidator(GeneratePostSchema)
    .handler(async ({ data }: { data: z.infer<typeof GeneratePostSchema> }) => {
        const { prompt, platform } = data;

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error("GROQ_API_KEY is not set in .env file");

        const groq = new Groq({ apiKey });

        const textPrompt = `Write a creative and engaging social media post for ${platform}. 
        Topic: ${prompt}.
        Include a few hashtags. Return ONLY the text content, no introductory text like 'Here is a post'.`;

        try {
            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: "user", content: textPrompt }],
                model: "openai/gpt-oss-120b", // Free, fast, and high quality
                temperature: 0.7,
                max_tokens: 1024,
            });

            const generatedText = chatCompletion.choices[0]?.message?.content || "Failed to generate content";
            return { content: generatedText };

        } catch (error) {
            console.error("Groq API Error:", error);
            throw new Error("Failed to generate text with Groq");
        }
    });


// --- 2. GENERATE IMAGE (Pollinations - Free) ---
export const generateAndUploadImageFn = createServerFn({ method: 'POST' })
    .inputValidator(GeneratePostSchema)
    .handler(async ({ data }: { data: z.infer<typeof GeneratePostSchema> }) => {
        const { prompt, platform } = data;
        const supabase = getSupabase();

        // 1. Generate Image URL
        const imagePrompt = encodeURIComponent(`Professional ${platform} social media image about: ${prompt}, high quality, photorealistic, 4k, no text`);
        const seed = Math.floor(Math.random() * 999999);
        const pollutionsUrl = `https://image.pollinations.ai/prompt/${imagePrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;

        // 2. Download Image
        const response = await fetch(pollutionsUrl);
        if (!response.ok) throw new Error("Failed to generate image from AI provider");
        
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Upload to Supabase
        const fileName = `post-images/${Date.now()}.png`;
        const { error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, buffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) {
            console.error('Supabase Storage Error:', uploadError);
            throw new Error('Failed to upload image to Supabase Storage');
        }

        // 4. Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);

        return { imageUrl: publicUrlData.publicUrl };
    });


// --- 3. SAVE TO DB ---
export const savePostFn = createServerFn({ method: 'POST' })
    .inputValidator(SavePostSchema)
    .handler(async ({ data }: { data: z.infer<typeof SavePostSchema> }) => {
        const { prompt, platform, content, image_url } = data;
        const supabase = getSupabase();

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
            console.error("Supabase DB Error:", error);
            throw new Error("Failed to save post history");
        }

        return savedPost;
    });