import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import AppSidebar from "../components/AppSidebar";
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Tooltip, Legend, Cell, BarChart, XAxis, CartesianGrid, YAxis, Bar } from "recharts";
import { useEffect, useState } from "react";

const dashboard = () => {
  const { auth } = useAuth();

  const [rssCount, setRssCount] = useState<number | null>(null);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [newsCount, setNewsCount] = useState<number | null>(null);

  // Sample data for charts
  const [isLoading, setIsloading] = useState(true);
  const salesData = [
    { name: "Mon", sales: 120 },
    { name: "Tue", sales: 150 },
    { name: "Wed", sales: 130 },
    { name: "Thu", sales: 200 },
    { name: "Fri", sales: 180 },
    { name: "Sat", sales: 220 },
    { name: "Sun", sales: 190 },
  ];

  const usersData = [
    { name: "Mon", users: 20 },
    { name: "Tue", users: 40 },
    { name: "Wed", users: 30 },
    { name: "Thu", users: 70 },
    { name: "Fri", users: 10 },
    { name: "Sat", users: 60 },
    { name: "Sun", users: 40 },
  ];

  const regionsData = [
    { name: "Top-Story", value: 18 },
    { name: "India", value: 32 },
    { name: "World", value: 15 },
    { name: "Tech", value: 35 },
  ]

  const monthlyVisitsData = [
    { name: "Mon", teamA: 45, teamB: 50 },
    { name: "Tue", teamA: 24, teamB: 10 },
    { name: "Wed", teamA: 75, teamB: 25 },
    { name: "Thu", teamA: 20, teamB: 64 },
    { name: "Fri", teamA: 19, teamB: 28 },
    { name: "Sat", teamA: 65, teamB: 47 },
    { name: "Sun", teamA: 53, teamB: 97 },
  ];

  const COLORS = ["#2E7CF6", "#F8B84E", "#7B5CF0", "#E25757"];

  useEffect(() => {
    const fetchData = async () => {
      setIsloading(true);
      try {
        const fetchRssCount = async () => {
          try {
            const response = await fetch("/api/feeds", {
              headers: {
                Authorization: `Bearer ${auth.token}`,
              },
            });
            if (!response.ok) throw new Error("Failed to fetch RSS feeds");
            const data = await response.json();
            setRssCount(Array.isArray(data) ? data.length : 0);
          } catch (error) {
            console.error(error);
            setRssCount(0);
          }
        };

        const fetchUserCount = async () => {
          try {
            const response = await fetch("/api/admin/users", {
              headers: {
                Authorization: `Bearer ${auth.token}`,
              },
            });
            if (!response.ok) throw new Error("Failed to fetch users");
            const data = await response.json();
            setUserCount(Array.isArray(data) ? data.length : 0);
          } catch (error) {
            console.error(error);
            setUserCount(0);
          }
        };

        const fetchNewsCount = async () => {
          try {
            const response = await fetch("/api/news", {
              headers: {
                Authorization: `Bearer ${auth.token}`,
              },
            });
            if (!response.ok) throw new Error("Failed to fetch news");
            const data = await response.json();
            setNewsCount(typeof data.totalCount === "number" ? data.totalCount : 0);
          } catch (error) {
            console.error(error);
            setNewsCount(0);
          }
        };
        // Your fetch calls
        await Promise.all([
          fetchRssCount(),
          fetchUserCount(),
          fetchNewsCount()
        ]);
      } catch (error) {
        console.error(error);
      } finally {
        setIsloading(false);
      }
    }
    fetchData();
  }, [auth.token]);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />

      <main className="md:pl-64 pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Hi, Welcome back 👋</h1>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-blue-light overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <span className="p-2 bg-blue-light rounded-full">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 22V12H15V22M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="#2E7CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <CardTitle className="text-gray-600 text-sm">RSS Feeds</CardTitle>
              </CardHeader>
              <CardContent>
                <h2 className="text-3xl font-bold">{rssCount !== null ? rssCount : '63'}</h2>
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={salesData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <Area type="monotone" dataKey="sales" stroke="#2E7CF6" fill="rgba(46, 124, 246, 0.1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-purple-light overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <span className="p-2 bg-purple-light rounded-full">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13M16 3.13C16.8604 3.3503 17.623 3.8507 18.1676 4.55231C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88M13 7C13 9.20914 11.2091 11 9 11C6.79086 11 5 9.20914 5 7C5 4.79086 6.79086 3 9 3C11.2091 3 13 4.79086 13 7Z" stroke="#7B5CF0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <CardTitle className="text-gray-600 text-sm">Users</CardTitle>
              </CardHeader>
              <CardContent>
                <h2 className="text-3xl font-bold">{userCount !== null ? userCount : '6'}</h2>
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={usersData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <Area type="monotone" dataKey="users" stroke="#7B5CF0" fill="rgba(123, 92, 240, 0.1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-yellow-light overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <span className="p-2 bg-yellow-light rounded-full">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 12V22H4V12M22 7H2V12H22V7ZM12 22V7M12 7H16.2C17.8802 7 18.7202 7 19.362 6.673C19.9265 6.3854 20.3854 5.92648 20.673 5.362C21 4.72022 21 3.88017 21 2.2V2H3V2.2C3 3.88017 3 4.72022 3.327 5.362C3.6146 5.92648 4.07351 6.3854 4.638 6.673C5.27979 7 6.11985 7 7.8 7H12Z" stroke="#F8B84E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <CardTitle className="text-gray-600 text-sm">News</CardTitle>
              </CardHeader>
              <CardContent>
                <h2 className="text-3xl font-bold">{newsCount !== null ? newsCount : '1200'}</h2>
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={salesData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <Area type="monotone" dataKey="sales" stroke="#F8B84E" fill="rgba(248, 184, 78, 0.1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-red-light overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <span className="p-2 bg-red-light rounded-full">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="#E25757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
                <CardTitle className="text-gray-600 text-sm">Messages</CardTitle>
              </CardHeader>
              <CardContent>
                <h2 className="text-3xl font-bold">234</h2>
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={salesData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <Area type="monotone" dataKey="sales" stroke="#E25757" fill="rgba(226, 87, 87, 0.1)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts and data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Current visits chart */}
            <Card>
              <CardHeader>
                <CardTitle>Current visits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={regionsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {regionsData.map((entry, index) => (
                          <Cell key={`cell - ${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Website visits chart */}
            <Card>
              <CardHeader>
                <CardTitle>Website visits</CardTitle>
                <p className="text-sm text-muted-foreground">(+43%) than last year</p>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyVisitsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="teamA" name="Team A" fill="#2E7CF6" />
                      <Bar dataKey="teamB" name="Team B" fill="#87CEFA" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Conversion rates */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Conversion rates</CardTitle>
                <p className="text-sm text-muted-foreground">(+43%) than last year</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">English</span>
                      <span className="text-sm text-muted-foreground">100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">French</span>
                      <span className="text-sm text-muted-foreground">70%</span>
                    </div>
                    <Progress value={70} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">German</span>
                      <span className="text-sm text-muted-foreground">45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Spanish</span>
                      <span className="text-sm text-muted-foreground">60%</span>
                    </div>
                    <Progress value={60} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>Current subject</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center p-6">
                  <div className="flex items-center gap-6">
                    <div className="text-5xl font-bold text-blue">TS</div>
                    <div className="h-16 w-1 bg-gray-200"></div>
                    <svg width="64" height="64" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 0L29.8564 8V24L16 32L2.14355 24V8L16 0Z" fill="#41B883" />
                      <path d="M16 0L29.8564 8V24L16 32V0Z" fill="#35495E" />
                      <path d="M16 5.86938L6.5166 11.0822V21.5076L16 26.7204L25.4834 21.5076V11.0822L16 5.86938Z" fill="#41B883" />
                    </svg>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default dashboard;
