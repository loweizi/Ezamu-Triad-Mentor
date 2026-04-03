import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, MapPin, Send } from "lucide-react";
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
      <div
        className="text-white py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #121c34 0%, #3131d8 100%)" }}
      >
        <div className="container mx-auto px-6 relative z-10 max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg text-white/80">
            Want to get in touch with Ezamu's team? Contact us through one of the methods below.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-slate-50 py-16">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Contact Info Cards */}
            <div className="space-y-5">
              {/* Address */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#3131d8]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#3131d8]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#121c34] mb-1">Address:</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    ScareLQ Corporation<br />
                    1968 South Coast Hwy #2504 Laguna Beach, CA 92651
                  </p>
                </div>
              </div>

              {/* Phone Number */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#3131d8]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-[#3131d8]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#121c34] mb-1">Phone Number:</h3>
                  <p className="text-slate-600 text-sm">
                    (M) +1 (213) 340-4505<br />
                    (O) +1 (213) 340-4505
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[#3131d8]/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-[#3131d8]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#121c34] mb-1">Email:</h3>
                  <a href="mailto:mk@ezamu.com" className="text-[#3131d8] text-sm font-medium hover:underline">
                    mk@ezamu.com
                  </a>
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
                        className="min-h-[140px] resize-none"
                        required
                      />
                    </div>

                    <Button type="submit" className="w-full bg-[#3131d8] hover:bg-[#3131d8]/90 h-12 text-base">
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
