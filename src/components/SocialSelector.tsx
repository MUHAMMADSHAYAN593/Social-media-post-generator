import { Instagram, Facebook, Linkedin, Twitter } from 'lucide-react';

interface SocialSelectorProps {
    selectedPlatform: string | null;
    onSelect: (platform: string) => void;
}

const SocialSelector = ({ selectedPlatform, onSelect }: SocialSelectorProps) => {
    const platforms = [
        { id: 'instagram', icon: Instagram, label: 'Instagram' },
        { id: 'facebook', icon: Facebook, label: 'Facebook' },
        { id: 'linkedin', icon: Linkedin, label: 'LinkedIn' },
        { id: 'twitter', icon: Twitter, label: 'X (Twitter)' },
    ];

    return (
        <div className="flex gap-4 mt-6 flex-wrap justify-center">
            {platforms.map((platform) => {
                const Icon = platform.icon;
                const isSelected = selectedPlatform === platform.id;

                return (
                    <button
                        key={platform.id}
                        onClick={() => onSelect(platform.id)}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300
              ${isSelected
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-slate-800 text-gray-300 hover:bg-slate-700 hover:text-white'
                            }
            `}
                    >
                        <Icon size={18} />
                        <span className="text-sm font-medium">{platform.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default SocialSelector;
