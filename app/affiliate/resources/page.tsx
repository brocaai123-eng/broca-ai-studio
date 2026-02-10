'use client';

import AffiliateLayout from '@/components/layout/AffiliateLayout';
import { useAffiliateResources, useAffiliateProfile } from '@/lib/hooks/use-affiliate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  FileText,
  Video,
  Image as ImageIcon,
  Link2,
  ExternalLink,
  Download,
  BookOpen,
  Copy,
  Check,
  Megaphone,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AffiliateResourcesPage() {
  const { data: resources, isLoading } = useAffiliateResources();
  const { data: profileData } = useAffiliateProfile();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const affiliate = profileData?.affiliate;
  const referralLink = affiliate
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?aff=${affiliate.referral_code}`
    : '';

  const getTypeIcon = (type: string) => {
    const icons: Record<string, typeof FileText> = {
      pdf: FileText,
      video: Video,
      image: ImageIcon,
      link: Link2,
      document: FileText,
    };
    return icons[type] || BookOpen;
  };

  const getTypeBadge = (type: string) => {
    const config: Record<string, { label: string; classes: string }> = {
      pdf: { label: 'PDF', classes: 'bg-red-100 text-red-700 border-red-200' },
      video: { label: 'Video', classes: 'bg-purple-100 text-purple-700 border-purple-200' },
      image: { label: 'Image', classes: 'bg-blue-100 text-blue-700 border-blue-200' },
      link: { label: 'Link', classes: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
      document: { label: 'Document', classes: 'bg-orange-100 text-orange-700 border-orange-200' },
    };
    const cfg = config[type] || { label: type, classes: 'bg-gray-100 text-gray-700' };
    return <Badge variant="outline" className={cfg.classes}>{cfg.label}</Badge>;
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <AffiliateLayout title="Resources" subtitle="Marketing materials and tools">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      </AffiliateLayout>
    );
  }

  // Separate featured resources from regular
  const allResources = resources || [];
  const featured = allResources.filter((r) => r.is_featured);
  const regular = allResources.filter((r) => !r.is_featured);

  return (
    <AffiliateLayout title="Resources" subtitle="Marketing materials, talking points, and compliance guides">
      {/* Referral Link Quick Access */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-primary/10 border-emerald-500/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="font-semibold text-app-foreground">Your Referral Link</p>
                <p className="text-sm text-app-muted">Include this in all your marketing materials</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-app-muted px-3 py-2 rounded-lg border border-app text-app-foreground font-mono truncate max-w-[300px]">
                {referralLink || 'Loading...'}
              </code>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                onClick={() => copyText(referralLink, 'link')}
                disabled={!referralLink}
              >
                {copiedId === 'link' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Resources */}
      {featured.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-app-foreground">Featured</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featured.map((resource) => {
              const Icon = getTypeIcon(resource.type);
              return (
                <Card key={resource.id} className="bg-app-card border-app hover:border-emerald-500/30 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <CardTitle className="text-base text-app-foreground">{resource.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {getTypeBadge(resource.type)}
                            <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">
                              Featured
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {resource.description && (
                      <p className="text-sm text-app-muted">{resource.description}</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      onClick={() => window.open(resource.url, '_blank')}
                    >
                      {resource.type === 'pdf' ? (
                        <><Download className="w-4 h-4 mr-2" /> Download</>
                      ) : (
                        <><ExternalLink className="w-4 h-4 mr-2" /> Open</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Resources */}
      {regular.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-app-foreground">All Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regular.map((resource) => {
              const Icon = getTypeIcon(resource.type);
              return (
                <Card key={resource.id} className="bg-app-card border-app hover:border-emerald-500/30 transition-colors">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-app-foreground text-sm truncate">{resource.title}</p>
                        {getTypeBadge(resource.type)}
                      </div>
                    </div>
                    {resource.description && (
                      <p className="text-xs text-app-muted line-clamp-2">{resource.description}</p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                      onClick={() => window.open(resource.url, '_blank')}
                    >
                      {resource.type === 'pdf' ? (
                        <><Download className="w-4 h-4 mr-2" /> Download</>
                      ) : (
                        <><ExternalLink className="w-4 h-4 mr-2" /> Open</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {allResources.length === 0 && (
        <Card className="bg-app-card border-app">
          <CardContent className="py-12 text-center text-app-muted">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium mb-1">No resources available yet</p>
            <p className="text-sm">Marketing materials will be added here soon.</p>
          </CardContent>
        </Card>
      )}
    </AffiliateLayout>
  );
}
