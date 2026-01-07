import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Upload, Loader2, RefreshCw } from 'lucide-react';
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

export const AvatarSelector = ({ currentAvatarUrl, userId, onAvatarUpdate, children }: AvatarSelectorProps) => {
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

            showSuccess('Avatar updated!');
            onAvatarUpdate();
            setIsOpen(false);
        } catch (error: any) {
            showError(error.message || 'Failed to update avatar');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                showError('Please upload an image file');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showError('Image must be less than 5MB');
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

            showSuccess('Avatar uploaded successfully!');
            onAvatarUpdate();
            setIsOpen(false);
        } catch (error: any) {
            console.error('Upload error:', error);
            showError(error.message || 'Failed to upload avatar. Ensure you have an "avatars" bucket.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children || <Button variant="outline">Change Avatar</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Customize Your Avatar</DialogTitle>
                    <DialogDescription>
                        Choose a preset or upload your own photo.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="presets" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="presets">Presets</TabsTrigger>
                        <TabsTrigger value="upload">Upload Custom</TabsTrigger>
                    </TabsList>

                    <TabsContent value="presets" className="space-y-4 py-4">
                        <div className="flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                                Style:
                                <select
                                    className="ml-2 bg-transparent border rounded p-1"
                                    value={selectedStyle}
                                    onChange={(e) => setSelectedStyle(e.target.value)}
                                >
                                    {PRESET_STYLES.map(style => (
                                        <option key={style} value={style}>{style}</option>
                                    ))}
                                </select>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSeed(Math.random().toString())}
                                title="Shuffle variations"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-4 gap-4 max-h-[300px] overflow-y-auto p-1">
                            {presets.map((url, i) => (
                                <button
                                    key={i}
                                    className="relative aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary transition-all p-1 hover:bg-accent"
                                    onClick={() => handlePresetSelect(url)}
                                    disabled={isUploading}
                                >
                                    <img
                                        src={url}
                                        alt={`Avatar option ${i}`}
                                        className="w-full h-full rounded-full"
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
                                    Upload new image
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="avatar-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                        disabled={isUploading}
                                        className="cursor-pointer"
                                    />
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md border border-primary">
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-center text-muted-foreground">
                                    Max size 5MB. Formats: JPG, PNG, GIF, WebP.
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
