import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Send, Mic, Image as ImageIcon, 
  Heart, MessageCircle, Share2, Repeat, ThumbsUp, MessageSquare, MoreHorizontal, Bookmark,
  Download
} from 'lucide-react';
import SocialSelector from './SocialSelector';
import { generatePostFn, savePostFn, generateAndUploadImageFn } from '../server/generate';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, ImageRun } from 'docx';
import FileSaver from 'file-saver';
// --- SUB-COMPONENT: REALISTIC SOCIAL MEDIA MOCKUPS ---
const SocialPostMockup = ({ platform, content, image }: { platform: string, content: string, image: string }) => {
  const containerClass = "w-full max-w-md mx-auto rounded-xl overflow-hidden shadow-2xl border";

  // 1. INSTAGRAM
  if (platform.toLowerCase() === 'instagram') {
    return (
      <div className={`${containerClass} bg-white text-black border-gray-200 font-sans`}>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-[2px]">
              <div className="w-full h-full bg-white rounded-full p-[2px]">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="avatar" className="w-full h-full rounded-full" />
              </div>
            </div>
            <span className="font-semibold text-sm">your_username</span>
          </div>
          <MoreHorizontal size={20} className="text-gray-600" />
        </div>
        <div className="w-full aspect-square bg-gray-100 relative">
             <img key={image} src={image} alt="Post" className="w-full h-full object-cover" loading="eager" />
        </div>
        <div className="p-3">
          <div className="flex justify-between mb-2">
            <div className="flex gap-4">
              <Heart size={24} className="hover:text-red-500 cursor-pointer" />
              <MessageCircle size={24} className="hover:text-gray-600 cursor-pointer" />
              <Send size={24} className="hover:text-gray-600 cursor-pointer -rotate-45 mb-1" />
            </div>
            <Bookmark size={24} className="hover:text-gray-600 cursor-pointer" />
          </div>
          <div className="font-semibold text-sm mb-1">1,234 likes</div>
          <div className="text-sm">
            <span className="font-semibold mr-2">your_username</span>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    );
  }

  // 2. TWITTER / X
  if (platform.toLowerCase() === 'twitter') {
    return (
      <div className={`${containerClass} max-w-xl bg-black text-white border-gray-800 font-sans`}>
        <div className="p-4 flex gap-3">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="avatar" className="w-10 h-10 rounded-full" />
          <div className="w-full">
            <div className="flex items-center gap-2">
              <span className="font-bold">Your Name</span>
              <span className="text-gray-500">@username · 1h</span>
            </div>
            <p className="mt-1 text-[15px] whitespace-pre-wrap mb-3 leading-normal">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </p>
            <div className="rounded-2xl overflow-hidden border border-gray-800 mt-2">
               <img key={image} src={image} alt="Tweet media" className="w-full object-cover max-h-[500px]" />
            </div>
            <div className="flex justify-between mt-4 text-gray-500 max-w-md">
              <MessageCircle size={18} />
              <Repeat size={18} />
              <Heart size={18} />
              <Share2 size={18} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. GENERIC / FACEBOOK
  return (
    <div className={`${containerClass} max-w-xl bg-white text-black border-gray-300 font-sans`}>
      <div className="p-4 flex gap-3 items-center">
        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="avatar" className="w-10 h-10 rounded-full" />
        <div>
          <div className="font-semibold text-sm">Your Name</div>
          <div className="text-xs text-gray-500">Just now • 🌍</div>
        </div>
      </div>
      <div className="px-4 pb-3 text-sm whitespace-pre-wrap">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
      <div className="w-full bg-gray-100">
         <img key={image} src={image} alt="Post content" className="w-full object-cover" />
      </div>
      <div className="px-4 py-2 flex justify-between border-t border-gray-200 mt-2">
        <button className="flex items-center gap-2 text-gray-600 px-4 py-2"><ThumbsUp size={18} /> Like</button>
        <button className="flex items-center gap-2 text-gray-600 px-4 py-2"><MessageSquare size={18} /> Comment</button>
        <button className="flex items-center gap-2 text-gray-600 px-4 py-2"><Share2 size={18} /> Share</button>
      </div>
    </div>
  );
};

// --- MAIN GEMINI LAYOUT ---
const GeminiLayout = () => {
    const [prompt, setPrompt] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedPost, setGeneratedPost] = useState<{ content: string; image_url: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Ref for scrolling to bottom
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Auto-scroll when a new post is generated
    useEffect(() => {
        if (generatedPost) {
            scrollToBottom();
        }
    }, [generatedPost]);

    const handleGenerate = async () => {
        if (!prompt || !selectedPlatform) return;
        setIsGenerating(true);
        setError(null);
        setGeneratedPost(null);

        try {
            const textResult = await generatePostFn({ data: { prompt, platform: selectedPlatform } });
            const imageResult = await generateAndUploadImageFn({ data: { prompt, platform: selectedPlatform } });

            const savedPost = await savePostFn({
                data: {
                    prompt,
                    platform: selectedPlatform,
                    content: textResult.content,
                    image_url: imageResult.imageUrl
                }
            });
            setGeneratedPost(savedPost);
        } catch (err) {
            console.error(err);
            setError("Failed to generate post. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownload = async () => {
        if (!generatedPost) return;

        const response = await fetch(generatedPost.image_url);
        const imageBuffer = await response.arrayBuffer();
        const imageUint8Array = new Uint8Array(imageBuffer);

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: imageUint8Array,
                                transformation: {
                                    width: 600,
                                    height: 600,
                                },
                                type: 'png',
                            }),
                        ],
                    }),
                    new Paragraph({
                        children: [
                            new TextRun(generatedPost.content),
                        ],
                    }),
                ],
            }],
        });

        Packer.toBlob(doc).then(blob => {
            FileSaver.saveAs(blob, "social-media-post.docx");
        });
    };

    return (
        // FIX: Use 'h-[100dvh]' for proper mobile viewport height handling
        // 'flex flex-col' allows the middle section to grow and push the footer down
        <div className="h-[100dvh] w-full bg-[#131314] text-[#E3E3E3] font-sans flex flex-col relative overflow-hidden selection:bg-blue-500/30">
            
            {/* Header (User Profile) - Absolute so it floats over content */}
            <div className="absolute top-4 right-6 flex items-center gap-4 z-50">
                 <div className="hidden md:block p-2 hover:bg-[#282A2C] rounded-full cursor-pointer transition-colors">
                    <div className="w-5 h-5 grid grid-cols-3 gap-[2px]">
                        {[...Array(9)].map((_,i) => <div key={i} className="bg-[#C4C7C5] rounded-[1px]"></div>)}
                    </div>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-medium text-sm cursor-pointer border-2 border-[#131314] ring-2 ring-transparent hover:ring-gray-600 transition-all">
                    U
                </div>
            </div>

            {/* SCROLLABLE CONTENT AREA (Flex-1 takes all available space) */}
            <div className="flex-1 w-full overflow-y-auto custom-scrollbar scroll-smooth">
                
                <div className="w-full max-w-[800px] mx-auto flex flex-col items-center pt-20 pb-4 px-4 md:px-6 min-h-full justify-center">
                    
                    {/* GREETING (Hidden if content exists) */}
                    {!generatedPost && (
                        <div className="w-full text-left animate-in fade-in duration-700 mb-12">
                            <h1 className="text-5xl md:text-6xl font-medium tracking-tight mb-3">
                                <span className="bg-gradient-to-r from-[#4285F4] via-[#9B72CB] to-[#D96570] bg-clip-text text-transparent leading-tight">
                                    Craft Your Perfect Post
                                </span>
                            </h1>
                            <p className="text-4xl md:text-6xl text-[#444746] font-medium leading-tight">
                                In One Click. ✨
                            </p>
                        </div>
                    )}

                    {/* OUTPUT DISPLAY */}
                    {generatedPost && selectedPlatform && (
                        <div className="w-full flex flex-col items-center gap-8 animate-in slide-in-from-bottom-10 fade-in duration-500 pb-10">
                             
                             {/* The Mockup */}
                             <SocialPostMockup 
                                platform={selectedPlatform} 
                                content={generatedPost.content} 
                                image={generatedPost.image_url} 
                             />

                             {/* ACTION BUTTONS */}
                             <div className="flex flex-wrap justify-center gap-3 w-full">
                                <button onClick={handleDownload} className="flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-[#5E5E5E] text-[#E3E3E3] hover:bg-[#282A2C] hover:border-[#E3E3E3] transition-all text-sm font-medium group min-w-[160px]">
                                    <Download size={18} className="group-hover:scale-110 transition-transform"/> 
                                    Download Post
                                </button>
                             </div>
                        </div>
                    )}
                    {/* Invisble div to scroll to */}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* INPUT AREA (Sticks to bottom naturally in Flex column) */}
            <div className="w-full shrink-0 bg-[#131314] pt-2 pb-6 px-4 z-40">
                <div className="w-full max-w-[800px] mx-auto">
                    
                    {/* INPUT BOX */}
                    <div className="w-full bg-[#1E1F20] rounded-[28px] p-3 border border-[#444746] focus-within:bg-[#282A2C] focus-within:border-[#5E5E5E] transition-all duration-200 shadow-lg relative flex flex-col">
                        
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the post you want to create..."
                            className="w-full bg-transparent text-[#E3E3E3] text-lg placeholder-[#8E918F] resize-none outline-none min-h-[30px] max-h-[150px] px-3 py-2 font-light"
                            rows={prompt ? 3 : 1}
                        />

                        <div className="flex flex-col md:flex-row justify-between items-center mt-2 pl-2 gap-3 md:gap-0">
                            
                            {/* Icons (Image/Mic) */}
                            <div className="flex gap-1 self-start md:self-auto">
                                <button className="p-2 hover:bg-[#333537] rounded-full text-[#E3E3E3] transition-colors" title="Add Image">
                                    <ImageIcon size={20} strokeWidth={1.5} />
                                </button>
                                <button className="p-2 hover:bg-[#333537] rounded-full text-[#E3E3E3] transition-colors" title="Use Microphone">
                                    <Mic size={20} strokeWidth={1.5} />
                                </button>
                            </div>

                            {/* Controls (Platform + Send) */}
                            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                                <SocialSelector
                                    selectedPlatform={selectedPlatform}
                                    onSelect={setSelectedPlatform}
                                />

                                <button
                                    onClick={handleGenerate}
                                    disabled={!prompt || !selectedPlatform || isGenerating}
                                    className={`
                                        p-2 rounded-full transition-all duration-300 flex items-center justify-center shrink-0
                                        ${(prompt && selectedPlatform)
                                            ? 'bg-white text-black hover:bg-[#E3E3E3] shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                                            : 'bg-[#444746] text-[#8E918F] cursor-not-allowed'
                                        }
                                    `}
                                >
                                    {isGenerating ? <Sparkles size={20} className="animate-spin text-[#4285F4]" /> : <Send size={18} className="ml-0.5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="text-center mt-3 text-xs text-[#8E918F] hidden md:block">
                        Gemini may display inaccurate info, including about people, so double-check its responses.
                    </div>
                </div>
            </div>

            {/* ERROR TOAST */}
            {error && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#2B0E0E] border border-[#F2B8B5] text-[#F2B8B5] px-6 py-3 rounded-full shadow-xl flex items-center gap-3 z-[100] w-[90%] md:w-auto justify-center">
                    <span className="w-2 h-2 rounded-full bg-[#F2B8B5] shrink-0"></span>
                    {error}
                </div>
            )}
        </div>
    );
};

export default GeminiLayout;