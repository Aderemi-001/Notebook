import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AdminBadgeProps {
    className?: string;
}

export const AdminBadge = ({ className }: AdminBadgeProps) => {
    return (
        <Badge
            variant="secondary"
            className={cn(
                "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 gap-1 px-2 py-0.5 ml-2 h-5 text-[10px] uppercase font-bold tracking-wider hover:bg-indigo-200 transition-colors",
                className
            )}
        >
            <ShieldCheck className="w-3 h-3" />
            Admin
        </Badge>
    );
};
