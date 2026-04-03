import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useGetCoaches, getGetCoachesQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search, User as UserIcon, Star, Filter } from "lucide-react";

export function AppointmentsPage() {
  const [search, setSearch] = useState("");
  
  // Using the hook pattern required
  const { data: coaches, isLoading } = useGetCoaches({ search }, { query: { queryKey: getGetCoachesQueryKey({ search }) } });

  return (
    <MainLayout>
      <div className="flex-1 bg-slate-50 py-8">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-[#121c34] mb-2">Find a Coach</h1>
              <p className="text-muted-foreground">Discover mentors who align with your goals and archetype.</p>
            </div>
            
            <div className="flex w-full md:w-auto gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or field..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="gap-4">
                    <div className="w-16 h-16 rounded-full bg-slate-200" />
                    <div>
                      <div className="h-5 bg-slate-200 rounded w-1/2 mb-2" />
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-slate-200 rounded w-full mb-2" />
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : coaches?.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed">
              <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-medium text-[#121c34] mb-2">No coaches found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {coaches?.map(coach => (
                <Card key={coach.id} className="hover:shadow-lg transition-shadow border-none shadow-sm flex flex-col">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
                        <AvatarImage src={coach.profilePicUrl || undefined} />
                        <AvatarFallback className="bg-[#121c34] text-white">
                          {coach.firstName.charAt(0)}{coach.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <Badge variant="secondary" className="bg-[#dbb68f]/20 text-[#121c34] border-none font-medium">
                        <Star className="w-3 h-3 mr-1 fill-current" /> {coach.studentCount} Students
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <CardTitle className="text-xl">{coach.firstName} {coach.lastName}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-2">
                        {coach.bio || "Experienced coach ready to help you discover your inner hero."}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-6 flex-1">
                    <div className="flex flex-wrap gap-2">
                      {coach.fieldsOfExpertise.map(field => (
                        <Badge key={field} variant="outline" className="bg-slate-50 border-slate-200">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <div className="p-6 pt-0 mt-auto">
                    <Link href={`/coach/${coach.id}`}>
                      <Button className="w-full bg-[#121c34] hover:bg-[#121c34]/90">
                        View Profile & Book
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
