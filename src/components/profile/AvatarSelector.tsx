import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface AvatarSelectorProps {
    currentAvatarUrl: string | null;
    userId: string;
    onAvatarUpdate: () => void;
    children?: React.ReactNode;
}

const PRESET_STYLES = [
    'adventurer',
    'avataaars',
    'big-ears',
    'bottts',
    'fun-emoji',
    'lorelei',
    'micah',
    'miniavs',
    'notionists',
    'open-peeps',
    'personas',
    'pixel-art'
];

const STYLE_DISPLAY_NAMES = new Map<string, string>([
    ['adventurer', 'Adventurer'],
    ['avataaars', 'Avatars'],
    ['big-ears', 'Big Ears'],
    ['bottts', 'Robots'],
    ['fun-emoji', 'Fun Emoji'],
    ['lorelei', 'Lorelei'],
    ['micah', 'Micah'],
    ['miniavs', 'Mini Avatars'],
    ['notionists', 'Notionists'],
    ['open-peeps', 'Open Peeps'],
    ['personas', 'Personas'],
    ['pixel-art', 'Pixel Art']
]);

export const AvatarSelector = ({ currentAvatarUrl, userId, onAvatarUpdate, children }: AvatarSelectorProps) => {
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState('notionists');
    const [seed, setSeed] = useState(userId);

    // Generate 12 variations based on the selected style
    const presets = Array.from({ length: 12 }, (_, i) =>
        `https://api.dicebear.com/9.x/${selectedStyle}/svg?seed=${seed}-${i}`
    );

    const handlePresetSelect = async (url: string) => {
        try {
            setIsUploading(true);
            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: url })
                .eq('id', userId);

            if (error) throw error;

            showSuccess(t('profile.avatar.updated'));
            onAvatarUpdate();
            setIsOpen(false);
        } catch (error: any) {
            showError(error.message || t('profile.avatar.errUpdate'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                showError(t('profile.avatar.errImageOnly'));
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showError(t('profile.avatar.errMaxSize'));
                return;
            }

            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', userId);

            if (updateError) throw updateError;

            showSuccess(t('profile.avatar.uploadSuccess'));
            onAvatarUpdate();
            setIsOpen(false);
        } catch (error: any) {
            console.error('Upload error:', error);
            showError(error.message || t('profile.avatar.errUpload'));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children || <Button variant="outline">{t('profile.avatar.change')}</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{t('profile.avatar.title')}</DialogTitle>
                    <DialogDescription>
                        {t('profile.avatar.chooseOrUpload')}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="presets" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="presets">{t('profile.avatar.presets')}</TabsTrigger>
                        <TabsTrigger value="upload">{t('profile.avatar.upload')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="presets" className="space-y-4 py-4">
                        <div className="flex justify-between items-center px-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground font-medium">{t('profile.avatar.style')}</span>
                                <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                                    <SelectTrigger className="w-[140px] h-8 bg-background border-input focus:ring-0 focus:ring-offset-0">
                                        <SelectValue placeholder="Select style" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRESET_STYLES.map(style => (
                                            <SelectItem key={style} value={style} className="cursor-pointer font-medium">
                                                {STYLE_DISPLAY_NAMES.get(style) || style}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSeed(Math.random().toString())}
                                title="Shuffle variations"
                                className="group"
                            >
                                <RefreshCw className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-4 gap-4 max-h-[300px] overflow-y-auto p-1 custom-scrollbar">
                            {presets.map((url, i) => (
                                <button
                                    key={i}
                                    className="relative aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary transition-all p-1 hover:bg-accent group"
                                    onClick={() => handlePresetSelect(url)}
                                    disabled={isUploading}
                                >
                                    <img
                                        src={url}
                                        alt={`Avatar option ${i}`}
                                        className="w-full h-full rounded-full group-hover:scale-110 transition-transform duration-300"
                                        loading="lazy"
                                    />
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-6 py-8">
                        <div className="flex flex-col items-center gap-4">
                            <Avatar className="h-32 w-32 border-4 border-muted">
                                <AvatarImage src={currentAvatarUrl || ''} />
                                <AvatarFallback className="text-4xl">?</AvatarFallback>
                            </Avatar>

                            <div className="w-full max-w-xs space-y-2">
                                <Label htmlFor="avatar-upload" className="text-center block">
                                    {t('profile.avatar.uploadNew')}
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="cursor-pointer file:text-foreground"
                                    />
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md border border-primary">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t('profile.avatar.uploading')}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-center text-muted-foreground">
                                    {t('profile.avatar.maxSize')}
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
