import { useState, useEffect, useRef } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Camera, Save, Check } from "lucide-react";

function resizeImageToDataUrl(file: File, maxPx = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const ALL_FIELDS = [
  "Science & Math", "Coding & Tech", "Arts & Design", 
  "Writing & Literature", "Business & Finance", "Healthcare",
  "Psychology", "Engineering", "Music & Performance"
];

export function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe();
  const updateMe = useUpdateMe();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [fields, setFields] = useState<string[]>([]);
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setBio(user.bio || "");
      setAge(user.age?.toString() || "");
      setFields(user.role === 'coach' ? user.fieldsOfExpertise : user.fieldsOfInterest);
    }
  }, [user]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setUploadingPic(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      await updateMe.mutateAsync({ data: { profilePicUrl: dataUrl } });
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast.success("Profile picture updated");
    } catch {
      toast.error("Failed to upload picture");
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFieldToggle = (field: string) => {
    setFields(prev => 
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateMe.mutate({
      data: {
        firstName,
        lastName,
        bio,
        age: age ? parseInt(age) : null,
        ...(user?.role === 'coach' ? { fieldsOfExpertise: fields } : { fieldsOfInterest: fields })
      }
    }, {
      onSuccess: () => {
        toast.success("Profile updated successfully");
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      },
      onError: () => {
        toast.error("Failed to update profile");
      }
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 py-12">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-[#121c34]">Profile Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account details and preferences.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="col-span-1">
              <Card className="border-none shadow-sm">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="relative mb-4 group">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPic}
                      className="relative block focus:outline-none"
                      title="Change profile picture"
                    >
                      <Avatar className="h-32 w-32 border-4 border-white shadow-md">
                        <AvatarImage src={user?.profilePicUrl || undefined} />
                        <AvatarFallback className="bg-[#121c34] text-white text-3xl">
                          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        {uploadingPic
                          ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                          : <Camera className="w-6 h-6 text-white" />
                        }
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPic}
                      className="absolute bottom-0 right-0 p-2 bg-[#dbb68f] text-[#121c34] rounded-full shadow-lg hover:bg-[#dbb68f]/90 transition-colors disabled:opacity-60"
                      title="Change profile picture"
                    >
                      {uploadingPic
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Camera className="w-4 h-4" />
                      }
                    </button>
                  </div>
                  <h2 className="text-xl font-bold text-[#121c34]">{user?.firstName} {user?.lastName}</h2>
                  <p className="text-muted-foreground text-sm">{user?.email}</p>
                  
                  <div className="mt-6 w-full p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Role</p>
                    <p className="font-medium text-[#121c34] capitalize">{user?.role}</p>
                    
                    {user?.innerHeroArchetype && (
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Inner Hero</p>
                        <p className="font-medium text-[#3131d8] capitalize">{user?.innerHeroArchetype}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="col-span-1 md:col-span-2">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your public profile details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          value={firstName} 
                          onChange={e => setFirstName(e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          value={lastName} 
                          onChange={e => setLastName(e.target.value)} 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input 
                        id="age" 
                        type="number"
                        value={age} 
                        onChange={e => setAge(e.target.value)} 
                        className="max-w-[150px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea 
                        id="bio" 
                        value={bio} 
                        onChange={e => setBio(e.target.value)} 
                        className="min-h-[120px]"
                        placeholder="Tell us a bit about yourself..."
                      />
                    </div>

                    <div className="space-y-3 pt-4 border-t">
                      <Label className="text-base font-semibold">
                        {user?.role === 'coach' ? 'Fields of Expertise' : 'Fields of Interest'}
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ALL_FIELDS.map(field => {
                          const checked = fields.includes(field);
                          return (
                            <button
                              key={field}
                              type="button"
                              onClick={() => handleFieldToggle(field)}
                              className={`flex items-center gap-3 p-3 rounded-lg border text-left w-full transition-colors ${
                                checked
                                  ? "border-[#3131d8] bg-[#3131d8]/5"
                                  : "border-slate-200 hover:border-[#3131d8]/30"
                              }`}
                            >
                              <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                                checked
                                  ? "bg-[#3131d8] border-[#3131d8]"
                                  : "bg-white border-slate-300"
                              }`}>
                                {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </div>
                              <span className="flex-1 font-medium text-sm text-[#121c34]">{field}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button 
                        type="submit" 
                        className="bg-[#121c34] hover:bg-[#121c34]/90 px-8"
                        disabled={updateMe.isPending}
                      >
                        {updateMe.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                    </div>
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
