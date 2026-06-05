import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft, Send, Users, Mail, BarChart3, FileText, Plus,
  Trash2, Copy, Eye, CheckCircle, AlertCircle, Loader2,
  Megaphone, Globe, TrendingUp, Inbox, Sparkles, Download,
  Upload, Search, X, ChevronRight, Zap, Target, Clock
} from "lucide-react";

// =============================
// TYPES
// =============================
interface Contact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  source: string;
  tags: string[];
  subscribed: boolean;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
  subject: string;
  html_content: string;
  text_content?: string;
  is_default: boolean;
}

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
  sent_at?: string;
}

const API_BASE = "/.netlify/functions";

// Pre-loaded sample contacts for demo
const SAMPLE_CONTACTS = [
  { email: "demo.user1@example.com", first_name: "Alice", last_name: "Johnson", tags: ["newsletter", "prospect"] },
  { email: "demo.user2@example.com", first_name: "Bob", last_name: "Smith", tags: ["student", "newsletter"] },
  { email: "demo.user3@example.com", first_name: "Carol", last_name: "Williams", tags: ["prospect"] },
  { email: "demo.user4@example.com", first_name: "David", last_name: "Brown", tags: ["student", "referral"] },
  { email: "demo.user5@example.com", first_name: "Emma", last_name: "Davis", tags: ["newsletter"] },
];

// =============================
// MARKETING HUB PAGE
// =============================
export default function MarketingHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Data states
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Campaign builder states
  const [campaignName, setCampaignName] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignHtml, setCampaignHtml] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  // Contact import
  const [importText, setImportText] = useState("");

  // Fetch all data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch contacts
      const { data: cData } = await supabase
        .from("marketing_contacts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (cData) setContacts(cData);

      // Fetch templates
      const { data: tData } = await supabase
        .from("marketing_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (tData) setTemplates(tData);

      // Fetch campaigns
      const { data: campData } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (campData) setCampaigns(campData);

      // If no contacts, add sample ones
      if (!cData || cData.length === 0) {
        await seedSampleContacts();
      }
    } catch (err) {
      console.warn("[MarketingHub] Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const seedSampleContacts = async () => {
    try {
      const { data } = await supabase
        .from("marketing_contacts")
        .insert(SAMPLE_CONTACTS)
        .select();
      if (data) setContacts(data);
    } catch (err) {
      console.warn("[Seed] Could not seed:", err);
    }
  };

  const handleLoadTemplate = (templateId: string) => {
    const tpl = templates.find(t => t.id === templateId);
    if (tpl) {
      setSelectedTemplate(templateId);
      setCampaignSubject(tpl.subject);
      setCampaignHtml(tpl.html_content);
      toast.success(`Loaded template: ${tpl.name}`);
    }
  };

  const handleSendCampaign = async () => {
    if (!campaignSubject || !campaignHtml) {
      toast.error("Please fill in subject and email content");
      return;
    }
    if (selectedContacts.length === 0) {
      toast.error("Please select at least one contact");
      return;
    }

    setSending(true);
    const name = campaignName || "Untitled Campaign";

    try {
      // Get selected contact emails
      const recipients = contacts
        .filter(c => selectedContacts.includes(c.id))
        .map(c => ({ email: c.email, name: c.first_name || c.email }));

      // Call our campaign function
      const res = await fetch(`${API_BASE}/send-campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients,
          subject: campaignSubject,
          html: campaignHtml,
          campaignName: name,
          personalization: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Save campaign to Supabase
        await supabase.from("marketing_campaigns").insert({
          name,
          subject: campaignSubject,
          html_content: campaignHtml,
          status: "sent",
          recipient_count: recipients.length,
          sent_count: data.sent,
          created_by: user?.email,
          sent_at: new Date().toISOString(),
        });

        toast.success(`Campaign sent! ${data.sent}/${data.total} delivered`);
        if (data.failed > 0) {
          toast.warning(`${data.failed} emails failed to deliver`);
        }

        // Refresh campaigns
        loadData();
        setActiveTab("campaigns");
      } else {
        throw new Error(data.error || "Send failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send campaign");
    } finally {
      setSending(false);
    }
  };

  const handleTestEmail = async () => {
    if (!campaignSubject || !campaignHtml) {
      toast.error("Please fill in subject and content first");
      return;
    }
    if (!user?.email) {
      toast.error("You need to be logged in");
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: user.email,
          subject: `[TEST] ${campaignSubject}`,
          html: campaignHtml.replace(/\{\{name\}\}/g, "Test User"),
          campaignId: "test",
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Test email sent to ${user.email}!`);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleImportContacts = async () => {
    if (!importText.trim()) {
      toast.error("Please paste some email addresses");
      return;
    }

    // Parse emails from text (comma, newline, or space separated)
    const emails = importText
      .split(/[,\n\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes("@") && e.includes("."));

    if (emails.length === 0) {
      toast.error("No valid email addresses found");
      return;
    }

    const newContacts = emails.map(email => ({
      email,
      source: "import",
      tags: ["imported"],
    }));

    try {
      const { data, error } = await supabase
        .from("marketing_contacts")
        .insert(newContacts)
        .select();

      if (error) throw error;

      if (data) {
        setContacts(prev => [...data, ...prev]);
        toast.success(`Imported ${data.length} contacts!`);
        setImportText("");
      }
    } catch (err: any) {
      toast.error(err.message || "Import failed");
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await supabase.from("marketing_contacts").delete().eq("id", id);
      setContacts(prev => prev.filter(c => c.id !== id));
      setSelectedContacts(prev => prev.filter(cid => cid !== id));
      toast.success("Contact deleted");
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const toggleContactSelection = (id: string) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const selectAllContacts = () => {
    setSelectedContacts(contacts.map(c => c.id));
  };

  const deselectAllContacts = () => {
    setSelectedContacts([]);
  };

  // Stats
  const stats = useMemo(() => ({
    totalContacts: contacts.length,
    subscribedContacts: contacts.filter(c => c.subscribed).length,
    totalCampaigns: campaigns.length,
    totalSent: campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0),
    avgOpenRate: campaigns.length > 0
      ? Math.round(campaigns.reduce((sum, c) => sum + (c.open_count || 0), 0) / Math.max(campaigns.reduce((sum, c) => sum + (c.sent_count || 1), 0), 1) * 100)
      : 0,
  }), [contacts, campaigns]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-orange-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300">Loading Marketing Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1a365d] to-[#0f172a]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="Anglotec AI" className="h-10 w-10 object-contain drop-shadow-lg rounded-xl" />
            <div>
              <h1 className="text-base font-bold tracking-wide text-white">Anglotec AI</h1>
              <p className="text-xs text-orange-400">Marketing Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
              <Zap size={12} className="mr-1" /> AI Marketing Agent
            </Badge>
            <Link to="/">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                <ArrowLeft size={18} className="mr-1" /> Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users size={24} className="text-blue-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalContacts}</p>
                  <p className="text-xs text-gray-300">Total Contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Mail size={24} className="text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalCampaigns}</p>
                  <p className="text-xs text-gray-300">Campaigns Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Send size={24} className="text-orange-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.totalSent.toLocaleString()}</p>
                  <p className="text-xs text-gray-300">Emails Delivered</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye size={24} className="text-purple-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.avgOpenRate}%</p>
                  <p className="text-xs text-gray-300">Avg Open Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <BarChart3 size={16} className="mr-1" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="campaign" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Megaphone size={16} className="mr-1" /> New Campaign
            </TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <FileText size={16} className="mr-1" /> Templates
            </TabsTrigger>
            <TabsTrigger value="contacts" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <Users size={16} className="mr-1" /> Contacts ({stats.totalContacts})
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              <TrendingUp size={16} className="mr-1" /> History
            </TabsTrigger>
          </TabsList>

          {/* DASHBOARD TAB */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Sparkles size={20} className="text-orange-400" /> Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={() => { setActiveTab("campaign"); setCampaignName("Welcome Campaign"); handleLoadTemplate(templates.find(t => t.category === "welcome")?.id || ""); }} className="w-full justify-start bg-white/5 hover:bg-white/10 text-white h-12">
                    <Mail size={18} className="mr-3 text-blue-400" /> Send Welcome Email to New Users
                    <ChevronRight size={16} className="ml-auto" />
                  </Button>
                  <Button onClick={() => { setActiveTab("campaign"); setCampaignName("Newsletter"); handleLoadTemplate(templates.find(t => t.category === "newsletter")?.id || ""); }} className="w-full justify-start bg-white/5 hover:bg-white/10 text-white h-12">
                    <Inbox size={18} className="mr-3 text-green-400" /> Send Monthly Newsletter
                    <ChevronRight size={16} className="ml-auto" />
                  </Button>
                  <Button onClick={() => { setActiveTab("campaign"); setCampaignName("Retention Campaign"); handleLoadTemplate(templates.find(t => t.category === "retention")?.id || ""); }} className="w-full justify-start bg-white/5 hover:bg-white/10 text-white h-12">
                    <Target size={18} className="mr-3 text-orange-400" /> Send Win-Back Offer
                    <ChevronRight size={16} className="ml-auto" />
                  </Button>
                  <Button onClick={() => setActiveTab("contacts")} className="w-full justify-start bg-white/5 hover:bg-white/10 text-white h-12">
                    <Users size={18} className="mr-3 text-purple-400" /> Import New Contacts
                    <ChevronRight size={16} className="ml-auto" />
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp size={20} className="text-green-400" /> Recent Campaigns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {campaigns.length === 0 ? (
                    <div className="text-center py-8 text-gray-300">
                      <Megaphone size={48} className="mx-auto mb-3 opacity-50" />
                      <p>No campaigns sent yet</p>
                      <Button onClick={() => setActiveTab("campaign")} variant="outline" className="mt-4 bg-white/10 border-white/20 text-white">
                        Send Your First Campaign
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {campaigns.slice(0, 5).map(camp => (
                        <div key={camp.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div>
                            <p className="text-white font-medium text-sm">{camp.name}</p>
                            <p className="text-gray-300 text-xs">{camp.subject}</p>
                          </div>
                          <div className="text-right">
                            <Badge className={camp.status === "sent" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}>
                              {camp.status}
                            </Badge>
                            <p className="text-gray-300 text-xs mt-1">{camp.sent_count}/{camp.recipient_count} sent</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Setup Guide */}
              <Card className="bg-white/5 border-white/10 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap size={20} className="text-yellow-400" /> Getting Started — Connect Resend for Email Sending
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg">
                      <div className="text-orange-400 font-bold text-lg mb-2">1. Get API Key</div>
                      <p className="text-gray-300 text-sm">Go to <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 underline">resend.com</a> and create a free account. Copy your API key.</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <div className="text-orange-400 font-bold text-lg mb-2">2. Add to Netlify</div>
                      <p className="text-gray-300 text-sm">In Netlify Dashboard → Site Settings → Environment Variables, add <code className="text-yellow-400">RESEND_API_KEY</code> with your key.</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                      <div className="text-orange-400 font-bold text-lg mb-2">3. Verify Domain</div>
                      <p className="text-gray-300 text-sm">In Resend, add and verify your domain (anglotec-ai.com) for best deliverability.</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-400/20 rounded-lg">
                    <p className="text-yellow-300 text-sm"><strong>Free Tier:</strong> Resend gives you 3,000 emails/day for free. Paid plans start at $20/month for 50,000 emails.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* NEW CAMPAIGN TAB */}
          <TabsContent value="campaign">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Campaign Form */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Create Email Campaign</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Campaign Name</Label>
                      <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g., March Newsletter" className="bg-white/5 border-white/10 text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-gray-300">Subject Line</Label>
                      <Input value={campaignSubject} onChange={e => setCampaignSubject(e.target.value)} placeholder="e.g., New AI Prompts Inside — Start Learning!" className="bg-white/5 border-white/10 text-white mt-1" />
                    </div>
                    <div>
                      <Label className="text-gray-300">Email Content (HTML)</Label>
                      <textarea
                        value={campaignHtml}
                        onChange={e => setCampaignHtml(e.target.value)}
                        placeholder="<html><body>Your email HTML here...</body></html>"
                        className="w-full h-64 bg-white/5 border border-white/10 text-white rounded-lg p-4 font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-orange-400/50 mt-1"
                      />
                      <p className="text-gray-300 text-xs mt-1">Use {"{{name}}"} to personalize with contact names</p>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={handleSendCampaign} disabled={sending} className="bg-orange-500 hover:bg-orange-600 text-white h-12 px-6">
                        {sending ? <Loader2 size={18} className="animate-spin mr-2" /> : <Send size={18} className="mr-2" />}
                        {sending ? "Sending..." : `Send to ${selectedContacts.length} Contacts`}
                      </Button>
                      <Button onClick={handleTestEmail} disabled={sending} variant="outline" className="bg-white/10 border-white/20 text-white h-12">
                        <Eye size={18} className="mr-2" /> Send Test to Me
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right: Template + Contacts */}
              <div className="space-y-6">
                {/* Template Selector */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Choose Template</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {templates.map(tpl => (
                        <button
                          key={tpl.id}
                          onClick={() => handleLoadTemplate(tpl.id)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${selectedTemplate === tpl.id ? "bg-orange-500/20 border border-orange-400/30" : "bg-white/5 hover:bg-white/10"}`}
                        >
                          <p className="text-white text-sm font-medium">{tpl.name}</p>
                          <p className="text-gray-300 text-xs">{tpl.subject}</p>
                          <Badge className="mt-1 bg-white/10 text-gray-300 text-[10px]">{tpl.category}</Badge>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Selector */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center justify-between">
                      <span>Select Recipients</span>
                      <span className="text-orange-400">{selectedContacts.length} selected</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-3">
                      <Button onClick={selectAllContacts} size="sm" variant="outline" className="bg-white/10 border-white/20 text-white text-xs">Select All</Button>
                      <Button onClick={deselectAllContacts} size="sm" variant="outline" className="bg-white/10 border-white/20 text-white text-xs">Clear</Button>
                    </div>
                    <div className="space-y-1 max-h-80 overflow-y-auto">
                      {contacts.map(contact => (
                        <label key={contact.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedContacts.includes(contact.id)}
                            onChange={() => toggleContactSelection(contact.id)}
                            className="w-4 h-4 accent-orange-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{contact.email}</p>
                            {contact.first_name && <p className="text-gray-300 text-xs">{contact.first_name} {contact.last_name}</p>}
                          </div>
                          {contact.tags?.map(tag => (
                            <Badge key={tag} className="bg-white/10 text-gray-300 text-[10px] shrink-0">{tag}</Badge>
                          ))}
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(tpl => (
                <Card key={tpl.id} className="bg-white/5 border-white/10 hover:border-white/20 transition-all">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-white text-base">{tpl.name}</CardTitle>
                      {tpl.is_default && <Badge className="bg-orange-500/20 text-orange-300 text-[10px]">Default</Badge>}
                    </div>
                    <Badge className="bg-white/10 text-gray-300 text-[10px] mt-1">{tpl.category}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-sm mb-3 font-medium">{tpl.subject}</p>
                    <div className="bg-black/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                      <code className="text-gray-300 text-xs whitespace-pre-wrap">{tpl.html_content.substring(0, 300)}...</code>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button onClick={() => { handleLoadTemplate(tpl.id); setActiveTab("campaign"); }} size="sm" className="bg-orange-500 hover:bg-orange-600 text-white flex-1">
                        <Copy size={14} className="mr-1" /> Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* CONTACTS TAB */}
          <TabsContent value="contacts">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center justify-between">
                      <span>Contact List</span>
                      <span className="text-gray-300 text-sm font-normal">{contacts.length} contacts</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {contacts.length === 0 ? (
                      <div className="text-center py-8 text-gray-300">
                        <Users size={48} className="mx-auto mb-3 opacity-50" />
                        <p>No contacts yet. Import some below!</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {contacts.map(contact => (
                          <div key={contact.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {(contact.first_name?.[0] || contact.email[0]).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm">{contact.first_name} {contact.last_name}</p>
                              <p className="text-gray-300 text-xs">{contact.email}</p>
                            </div>
                            <div className="flex gap-1">
                              {contact.tags?.map(tag => (
                                <Badge key={tag} className="bg-white/10 text-gray-300 text-[10px]">{tag}</Badge>
                              ))}
                            </div>
                            <Badge className={contact.subscribed ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}>
                              {contact.subscribed ? "Active" : "Unsub"}
                            </Badge>
                            <button onClick={() => handleDeleteContact(contact.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Import Panel */}
              <div className="space-y-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Upload size={16} className="text-orange-400" /> Import Contacts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <textarea
                      value={importText}
                      onChange={e => setImportText(e.target.value)}
                      placeholder="Paste emails here (comma, space, or newline separated)...&#10;e.g. john@example.com, jane@example.com"
                      className="w-full h-32 bg-white/5 border border-white/10 text-white rounded-lg p-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                    />
                    <Button onClick={handleImportContacts} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                      <Upload size={16} className="mr-2" /> Import Contacts
                    </Button>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white text-sm">Export Contacts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => {
                        const csv = "Email,First Name,Last Name,Tags\n" + contacts.map(c => `${c.email},${c.first_name || ""},${c.last_name || ""},"${c.tags?.join(";") || ""}"`).join("\n");
                        const blob = new Blob([csv], { type: "text/csv" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "anglotec-contacts.csv";
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      variant="outline"
                      className="w-full bg-white/10 border-white/20 text-white"
                    >
                      <Download size={16} className="mr-2" /> Download CSV
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* CAMPAIGNS HISTORY TAB */}
          <TabsContent value="campaigns">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Campaign History</CardTitle>
              </CardHeader>
              <CardContent>
                {campaigns.length === 0 ? (
                  <div className="text-center py-12 text-gray-300">
                    <Clock size={48} className="mx-auto mb-3 opacity-50" />
                    <p>No campaigns yet</p>
                    <Button onClick={() => setActiveTab("campaign")} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white">
                      Create First Campaign
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-300 text-xs border-b border-white/10">
                          <th className="pb-3 pl-3">Campaign</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Recipients</th>
                          <th className="pb-3">Sent</th>
                          <th className="pb-3">Opens</th>
                          <th className="pb-3">Clicks</th>
                          <th className="pb-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map(camp => (
                          <tr key={camp.id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                            <td className="py-3 pl-3">
                              <p className="text-white text-sm font-medium">{camp.name}</p>
                              <p className="text-gray-300 text-xs">{camp.subject}</p>
                            </td>
                            <td>
                              <Badge className={
                                camp.status === "sent" ? "bg-green-500/20 text-green-300" :
                                camp.status === "draft" ? "bg-gray-500/20 text-gray-300" :
                                "bg-yellow-500/20 text-yellow-300"
                              }>
                                {camp.status}
                              </Badge>
                            </td>
                            <td className="text-white text-sm">{camp.recipient_count}</td>
                            <td className="text-green-400 text-sm">{camp.sent_count}</td>
                            <td className="text-blue-400 text-sm">{camp.open_count}</td>
                            <td className="text-purple-400 text-sm">{camp.click_count}</td>
                            <td className="text-gray-300 text-xs">{new Date(camp.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
