import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, User, Lock, MapPin, MessageCircle, Save, Loader2, Check, Phone, Ticket, Gift, Coins, Gamepad2, Percent, Camera, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useGacha } from "@/context/GachaContext";
import { useI18n } from "@/context/I18nContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import defaultAvatar from "@/assets/default-avatar.png";

const WA_NUMBER = "6282231283948";
const WA_MESSAGE = encodeURIComponent("Halo, saya ingin bertanya tentang layanan Bushido Gacha.");

const Profile = () => {
  const { user } = useAuth();
  const { addCoins, refreshCoins } = useGacha();
  const { t } = useI18n();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultTab = searchParams.get("tab") === "avatar" ? "avatar" : "address";

  // Address state
  const [profile, setProfile] = useState({
    display_name: "",
    phone: "",
    recipient_name: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [redeemingCoupon, setRedeemingCoupon] = useState(false);
  const [redemptions, setRedemptions] = useState<any[]>([]);

  const fetchRedemptions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("coupon_redemptions")
      .select("*, coupons:coupon_id(code, description)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setRedemptions(data || []);
  };

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone, recipient_name, address, city, province, postal_code, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          display_name: data.display_name || "",
          phone: data.phone || "",
          recipient_name: data.recipient_name || "",
          address: data.address || "",
          city: data.city || "",
          province: data.province || "",
          postal_code: data.postal_code || "",
        });
        setAvatarUrl(data.avatar_url || "");
      } else {
        await supabase.from("profiles").insert({ user_id: user.id });
      }
      setLoadingProfile(false);
    };
    fetchProfile();
    fetchRedemptions();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "File harus berupa gambar", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Error", description: "Ukuran file maksimal 2MB", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("campaign-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("campaign-images")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({ title: "Berhasil", description: "Foto profil berhasil diperbarui" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Gagal upload foto", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update(profile)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error", description: "Gagal menyimpan profil", variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Profil berhasil disimpan" });
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password minimal 6 karakter", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Password tidak cocok", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Berhasil", description: "Password berhasil diubah" });
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  const handleRedeemCoupon = async () => {
    if (!couponCode.trim()) return;
    setRedeemingCoupon(true);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-coupon", {
        body: { code: couponCode.trim() },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Gagal menggunakan Bushido Kupon");
      }
      if (data.benefit_type === "bonus_coins") {
        addCoins(data.benefit_value);
      }
      // Refresh coins state to pick up free_draws / discount changes
      await refreshCoins();
      toast({
        title: "Kupon Berhasil Digunakan! 🎉",
        description: data.description + (data.coupon_description ? ` — ${data.coupon_description}` : ""),
      });
      setCouponCode("");
      fetchRedemptions();
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setRedeemingCoupon(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {t("backToCampaigns")}
        </Link>

        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="relative group">
            <Avatar className="h-20 w-20 border-4 border-primary/50">
              <AvatarImage src={avatarUrl || defaultAvatar} alt="Avatar" />
              <AvatarFallback>
                <img src={defaultAvatar} alt="Avatar" className="h-full w-full object-cover" />
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Camera className="h-6 w-6 text-white" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wider text-foreground">Profil Saya</h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        <div className="mx-auto max-w-lg">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="avatar" className="gap-1 text-xs"><Camera className="h-3.5 w-3.5" /> Foto</TabsTrigger>
              <TabsTrigger value="address" className="gap-1 text-xs"><MapPin className="h-3.5 w-3.5" /> Alamat</TabsTrigger>
              <TabsTrigger value="coupon" className="gap-1 text-xs"><Ticket className="h-3.5 w-3.5" /> Bushido Kupon</TabsTrigger>
              <TabsTrigger value="password" className="gap-1 text-xs"><Lock className="h-3.5 w-3.5" /> Password</TabsTrigger>
              <TabsTrigger value="help" className="gap-1 text-xs"><MessageCircle className="h-3.5 w-3.5" /> Bantuan</TabsTrigger>
            </TabsList>

            {/* Avatar Tab */}
            <TabsContent value="avatar">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-lg">
                      <Camera className="h-5 w-5 text-primary" /> Edit Foto Profil
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-6">
                    <div className="relative group">
                      <Avatar className="h-32 w-32 border-4 border-primary/50">
                        <AvatarImage src={avatarUrl || defaultAvatar} alt="Avatar" />
                        <AvatarFallback>
                          <img src={defaultAvatar} alt="Avatar" className="h-full w-full object-cover" />
                        </AvatarFallback>
                      </Avatar>
                      {uploadingAvatar && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                          <Loader2 className="h-8 w-8 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Format: JPG, PNG. Maksimal 2MB.</p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="w-full"
                    >
                      {uploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Pilih Foto
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Address Tab */}
            <TabsContent value="address">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-lg">
                      <MapPin className="h-5 w-5 text-primary" /> Alamat Pengiriman
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Tampilan</label>
                      <Input value={profile.display_name} onChange={(e) => setProfile({ ...profile, display_name: e.target.value })} placeholder="Nama kamu" className="bg-secondary" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Nama Penerima</label>
                      <Input value={profile.recipient_name} onChange={(e) => setProfile({ ...profile, recipient_name: e.target.value })} placeholder="Nama penerima paket" className="bg-secondary" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">No. Telepon</label>
                      <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="08xxxxxxxxxx" className="bg-secondary" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Alamat Lengkap</label>
                      <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Jl. ..." className="bg-secondary" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Kota</label>
                        <Input value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} placeholder="Kota" className="bg-secondary" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Provinsi</label>
                        <Input value={profile.province} onChange={(e) => setProfile({ ...profile, province: e.target.value })} placeholder="Provinsi" className="bg-secondary" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Kode Pos</label>
                      <Input value={profile.postal_code} onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })} placeholder="12345" className="bg-secondary" />
                    </div>
                    <Button className="w-full" onClick={handleSaveProfile} disabled={savingProfile}>
                      {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Simpan Alamat
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Coupon Tab */}
            <TabsContent value="coupon">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-lg">
                      <Ticket className="h-5 w-5 text-primary" /> Bushido Kupon
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Masukkan kode Bushido Kupon"
                        className="bg-secondary font-mono"
                        maxLength={30}
                      />
                      <Button onClick={handleRedeemCoupon} disabled={redeemingCoupon || !couponCode.trim()}>
                        {redeemingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                    </div>
                    {redemptions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Riwayat Bushido Kupon</p>
                        {redemptions.map((r: any) => {
                          const benefitIcon = r.benefit_type === "bonus_coins" ? Coins : r.benefit_type === "free_gacha" ? Gamepad2 : Percent;
                          const BIcon = benefitIcon;
                          const benefitText = r.benefit_type === "bonus_coins"
                            ? `+${r.benefit_value.toLocaleString()} Koin`
                            : r.benefit_type === "free_gacha"
                            ? `${r.benefit_value}x Gacha Gratis`
                            : `Diskon ${r.benefit_value}%`;
                          return (
                            <div key={r.id} className="flex items-center gap-3 rounded-lg bg-secondary p-3">
                              <BIcon className="h-4 w-4 text-accent shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{(r as any).coupons?.code || "—"}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-xs">{benefitText}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="password">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-lg">
                      <Lock className="h-5 w-5 text-primary" /> Ganti Password
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Password Baru</label>
                      <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" className="bg-secondary" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted-foreground">Konfirmasi Password</label>
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" className="bg-secondary" />
                    </div>
                    <Button className="w-full" onClick={handleChangePassword} disabled={savingPassword || !newPassword}>
                      {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                      Ubah Password
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="help">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-lg">
                      <MessageCircle className="h-5 w-5 text-primary" /> Hubungi Customer Service
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Ada pertanyaan atau kendala? Tim CS kami siap membantu melalui WhatsApp.
                    </p>
                    <div className="rounded-lg bg-secondary p-4 text-center">
                      <p className="text-xs text-muted-foreground">PT. BUSHIDO TOVARICH TECHNOLOGY</p>
                      <div className="mt-1 flex items-center justify-center gap-2">
                        <Phone className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-foreground">082231283948</span>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Chat via WhatsApp
                    </a>
                    <p className="text-center text-xs text-muted-foreground">
                      Senin - Jumat, 09:00 - 18:00 WIB
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Profile;
