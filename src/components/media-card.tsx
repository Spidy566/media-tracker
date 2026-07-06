import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReactNode } from "react";

interface MediaCardProps {
    title: string;
    imageUrl: string | null;
    href?: string;
    status?: string;
    subtitle?: string;
    actionButton?: ReactNode;
}

export function MediaCard({ title, imageUrl, href, status, subtitle, actionButton }: MediaCardProps) {
    const cardContent = (
        <Card className="hover:opacity-80 transition h-full flex flex-col">
            <CardContent className="p-2 flex-grow">
                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="rounded-md mb-2 w-full object-cover aspect-[2/3]" />
                ) : (
                    <div className="bg-gray-200 aspect-[2/3] rounded-md mb-2 flex items-center justify-center text-sm text-gray-500">
                        No image
                    </div>
                )}
                
                <p className="text-sm font-medium line-clamp-2">{title}</p>
                
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                
                {status && (
                    <Badge variant="secondary" className="mt-1">
                        {status.replace(/_/g, " ")}
                    </Badge>
                )}
            </CardContent>
            
            {actionButton && <div className="p-2 pt-0 mt-auto">{actionButton}</div>}
        </Card>
    );

    if (href) {
        return <Link href={href}>{cardContent}</Link>;
    }

    return cardContent;
}