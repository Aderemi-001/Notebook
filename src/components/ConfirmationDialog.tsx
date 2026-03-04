import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, AlertCircle } from "lucide-react";

interface ConfirmationDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'info' | 'warning' | 'danger';
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onOpenChange,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = 'info'
}) => {
    const getIcon = () => {
        switch (variant) {
            case 'danger': return <AlertCircle className="h-10 w-10 text-red-500" />;
            case 'warning': return <AlertTriangle className="h-10 w-10 text-amber-500" />;
            default: return <ShieldCheck className="h-10 w-10 text-primary" />;
        }
    };

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger': return 'bg-red-500 hover:bg-red-600 shadow-red-500/20';
            case 'warning': return 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20';
            default: return 'bg-primary hover:bg-primary/90 shadow-primary/20';
        }
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent className="glass-card border-white/20 dark:border-white/10 rounded-[2.5rem] p-1 overflow-hidden max-w-md shadow-2xl">
                <div className="bg-white/40 dark:bg-black/20 backdrop-blur-2xl px-8 py-10 rounded-[2.3rem] border border-white/10">
                    <AlertDialogHeader className="items-center text-center space-y-4">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-20 h-20 bg-muted/30 rounded-3xl flex items-center justify-center mb-2"
                        >
                            {getIcon()}
                        </motion.div>
                        <AlertDialogTitle className="text-2xl font-black tracking-tight text-foreground">
                            {title}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-muted-foreground leading-relaxed">
                            {description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 sm:justify-center gap-3">
                        <AlertDialogCancel className="h-12 px-8 rounded-xl border-border/50 bg-background/50 hover:bg-muted font-bold transition-all">
                            {cancelText}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={onConfirm}
                            className={`h-12 px-8 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 ${getVariantStyles()}`}
                        >
                            {confirmText}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default ConfirmationDialog;
