import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MessageSquare, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

export function ContactPage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Message sent! We'll get back to you soon.");
    (e.target as HTMLFormElement).reset();
  };

  return (
    <MainLayout>
      {/* Header */}
      <div className="bg-[#121c34] text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-luminosity"></div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Get in Touch</h1>
          <p className="text-lg text-white/80">
            Have questions about Ezamu or want to learn how to bring our triad mentorship model to your school? We're here to help.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 py-16">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-serif font-bold text-[#121c34] mb-6">Reach out to our team</h2>
                <p className="text-muted-foreground mb-8">
                  Whether you're a student looking for guidance, a coach wanting to give back, or an administrator interested in partnerships, we'd love to hear from you.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#acedff]/20 flex items-center justify-center flex-shrink-0 text-[#121c34]">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#121c34]">Email Us</h3>
                    <p className="text-muted-foreground mb-1">For general inquiries and support.</p>
                    <a href="mailto:hello@ezamu.com" className="text-[#3131d8] font-medium hover:underline">hello@ezamu.com</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#dbb68f]/20 flex items-center justify-center flex-shrink-0 text-[#bb7e5d]">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#121c34]">Partnerships</h3>
                    <p className="text-muted-foreground mb-1">Interested in bringing Ezamu to your school?</p>
                    <a href="mailto:partners@ezamu.com" className="text-[#3131d8] font-medium hover:underline">partners@ezamu.com</a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#607b7d]/20 flex items-center justify-center flex-shrink-0 text-[#607b7d]">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#121c34]">Office</h3>
                    <p className="text-muted-foreground mb-1">Our headquarters.</p>
                    <p className="text-[#121c34] font-medium">San Francisco, CA</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <Card className="border-none shadow-lg">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-[#121c34] mb-6">Send a Message</h3>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="Jane" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" required />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" placeholder="jane@example.com" required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="How can we help?" required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Tell us what's on your mind..." 
                        className="min-h-[150px] resize-none"
                        required
                      />
                    </div>
                    
                    <Button type="submit" className="w-full bg-[#121c34] hover:bg-[#121c34]/90 h-12 text-md">
                      Send Message
                      <Send className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
