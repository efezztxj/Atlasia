import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Apple, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Compass,
  Copy, Eye, EyeOff, Globe2, Info, KeyRound, Loader2, LockKeyhole,
  Mail, Monitor, Phone, ShieldCheck, X,
} from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { useAuth, type SignupResult } from "../contexts/AuthContext";
import { authConfigured, authErrorMessage, getAtlasAuth, requestPasswordReset, signInSocial } from "../lib/auth";
import { isValidEmail, normalizeEmail, passwordRules, validPassword } from "../lib/accountTypes";
import { resetDevicePassword } from "../lib/deviceAccounts";
import { usePanelAccess } from "../hooks/usePanelAccess";

type Screen = "credentials" | "phone" | "code" | "reset" | "recovery";
type Busy = "email" | "google" | "apple" | "phone" | "code" | "reset" | "recovery" | "finish";
type FieldErrors = Partial<Record<"email" | "password" | "name" | "terms" | "phone" | "code" | "recovery", string>>;
const LANDSCAPE = "https://images.pexels.com/photos/19139425/pexels-photo-19139425.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1600&w=2400";

function GoogleMark() {
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.5c-.9.6-2.07.97-3.38.97-2.6 0-4.8-1.76-5.6-4.12H3.05v2.58A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.95A6 6 0 0 1 6.08 12c0-.68.12-1.34.32-1.95V7.47H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.53l3.35-2.58Z"/><path fill="#EA4335" d="M12 5.93c1.47 0 2.79.5 3.83 1.52l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.95 5.47l3.35 2.58c.8-2.36 3-4.12 5.6-4.12Z"/></svg>;
}

function AuthFrame({ signup = false, children, onSwitch, onLegal }: {
  signup?: boolean;
  children: ReactNode;
  onSwitch?: () => void;
  onLegal?: (type: "privacy" | "terms") => void;
}) {
  const { backend } = useAuth();
  return <main className={`auth-page ${signup ? "auth-signup-page" : "auth-login-page"}`}>
    {signup && <section className="auth-intro" aria-label="Atlasia hakkında">
      <img className="auth-landscape" src={LANDSCAPE} alt="Lofoten'de dağların arasındaki turkuaz fiyort ve Reine köyü" fetchPriority="high" />
      <div className="auth-landscape-shade" />
      <header className="auth-brandline"><a href="/" aria-label="Atlasia başlangıç"><Compass size={22} strokeWidth={1.4} /><span>Atlasia<span className="auth-gold">.</span></span></a><span className="auth-overline">MERAK ETTİĞİN HER YER</span></header>
      <div className="auth-intro-copy">
        <p className="auth-eyebrow"><span />YOLCULUK, MERAKLA BAŞLAR</p>
        <h1>Atlasia<span>.</span></h1>
        <h2>Dünyayı <span>merakınla</span><br />keşfet.</h2>
        <p className="auth-description">Gezginlerin bıraktığı izleri bul, kendi rotanı çiz.<br className="hidden xl:block" /> Sevdiğin yerleri yolculuğunun bir parçası yap.</p>
      </div>
      <footer className="auth-intro-footer"><span><Globe2 size={15} strokeWidth={1.4} />Dünya büyük. Bir yerden başla.</span><span>Fotoğraf: Clément Proust / Pexels</span></footer>
    </section>}

    <section className="auth-access" aria-label={signup ? "Atlasia üyelik formu" : "Atlasia giriş formu"}>
      {signup ? <div className="auth-account-switch">Zaten hesabın var mı? <button type="button" onClick={onSwitch}>Giriş yap <ArrowRight size={14} /></button></div> : <a className="auth-login-brand" href="/" aria-label="Atlasia başlangıç"><span><Compass size={32} strokeWidth={1.25} /></span><strong>Atlasia<span>.</span></strong></a>}
      <div className="auth-form-wrap">{children}</div>
      <footer className="auth-access-footer"><p>© {new Date().getFullYear()} Atlasia</p><div>{onLegal ? <><button type="button" onClick={() => onLegal("privacy")}>Gizlilik</button><span>·</span><button type="button" onClick={() => onLegal("terms")}>Koşullar</button></> : <span>{backend === "device" ? "Bu cihaza özel hesap" : "Firebase Authentication"}</span>}</div></footer>
    </section>
  </main>;
}

function FormError({ message, id }: { message?: string; id?: string }) {
  return message ? <p id={id} className="auth-inline-error" role="alert">{message}</p> : null;
}

function Message({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <p className={`auth-feedback ${success ? "auth-feedback-success" : ""}`} role={success ? "status" : "alert"}>{success ? <CheckCircle2 size={16} /> : <Info size={16} />}<span>{children}</span></p>;
}

function BackendNote() {
  const { backend } = useAuth();
  if (backend === "firebase") return null;
  return <div className="auth-device-note"><Monitor size={16} /><p><strong>Bu cihaza özel hesap.</strong> Kayıt ve giriş çalışır; e-posta sahipliği doğrulanmaz. Hesabın başka cihazlarla eşitlenmez.</p></div>;
}

function PasswordField({ id, label = "Şifre", value, onChange, error, fresh = false, forgot, disabled = false }: {
  id: string; label?: string; value: string; onChange: (value: string) => void;
  error?: string; fresh?: boolean; forgot?: ReactNode; disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const rules = passwordRules(value);
  return <div className="auth-field">
    <div className="auth-field-label"><label htmlFor={id}>{label}</label>{forgot}</div>
    <div className="auth-input-with-action">
      <input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={fresh ? "new-password" : "current-password"} maxLength={128} disabled={disabled} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : fresh ? `${id}-help` : undefined} />
      <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={visible} className="auth-input-action">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
    </div>
    <FormError message={error} id={`${id}-error`} />
    {fresh && <div id={`${id}-help`} className="auth-password-help"><ul>{[["length", "En az 8 karakter"], ["letter", "Bir harf"], ["number", "Bir rakam"]].map(([key, text]) => <li key={key} data-valid={rules[key as keyof typeof rules]}>{rules[key as keyof typeof rules] ? <Check size={13} /> : <Circle size={11} />}{text}</li>)}</ul><p>Atlasia için ayrı bir şifre seç; Google veya Apple şifreni kullanma.</p></div>}
  </div>;
}

function LegalNotice({ type, onClose }: { type: "privacy" | "terms"; onClose: () => void }) {
  const { backend } = useAuth();
  const ref = usePanelAccess(true, onClose, true);
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4"><button type="button" className="absolute inset-0" onClick={onClose} aria-label="Açıklamayı kapat" /><aside ref={ref} role="dialog" aria-modal="true" aria-labelledby="account-legal-title" className="relative w-full max-w-lg rounded-3xl border border-white/15 bg-ink-2 p-7"><button type="button" onClick={onClose} aria-label="Açıklamayı kapat" className="absolute right-4 top-4 grid size-11 place-items-center"><X size={19} /></button><h2 id="account-legal-title" className="font-display pr-8 text-2xl">{type === "privacy" ? "Gizlilik açıklaması" : "Kullanım koşulları"}</h2><p className="mt-4 text-[15px] leading-relaxed text-mint/85">{type === "privacy" ? backend === "device" ? "Bu modda hesap yalnızca bu cihazın tarayıcısında tutulur. Şifre düz metin olarak saklanmaz; rastgele salt ile PBKDF2 özeti kaydedilir. E-posta doğrulaması veya SMS gönderimi yapılmaz. Tarayıcı verilerini silersen hesabın ve kayıtların kaybolabilir. Bu cihazdaki hesap, çevrimiçi bir kimlik doğrulama hizmeti değildir." : "Hesap girişi Firebase Authentication üzerinden yapılır. E-posta ve şifre veya onayladığın sağlayıcı kullanılır. Atlasia sağlayıcı hesabının şifresini görmez. Yerler ve rotalar bu sürümde cihazında saklanır. Konum ayrı izin ister; paylaşmak zorunda değilsin." : "Bir hesap oluşturup kendi yerlerini ve rotalarını yönetebilirsin. Başkalarının özel bilgilerini paylaşma ve izinsiz görsel yükleme. Rota ve rehber bilgileri öneridir; saat, ücret, güvenlik ve erişim koşullarını ilgili resmî kaynaklardan doğrula."}</p><button type="button" onClick={onClose} className="mt-6 min-h-11 rounded-full bg-sun px-6 text-sm font-semibold text-ink">Okudum</button></aside></div>;
}

export default function AccountAccess() {
  const { backend, checking, error: sessionError, login, signup } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [screen, setScreen] = useState<Screen>("credentials");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("Türkiye");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);
  const [phone, setPhone] = useState("");
  const [prefix, setPrefix] = useState("+90");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [receipt, setReceipt] = useState<SignupResult | null>(null);
  const [savedRecovery, setSavedRecovery] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const pendingPhone = useRef<ConfirmationResult | null>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const locked = useRef(false);
  const blocked = !!busy || checking;

  useEffect(() => () => verifier.current?.clear(), []);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown((current) => current - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);

  const resetMessages = () => { setErrors({}); setError(null); setSuccess(null); };
  const switchMode = () => { setMode((current) => current === "signin" ? "signup" : "signin"); setScreen("credentials"); setPassword(""); setReceipt(null); resetMessages(); };
  const backToLogin = () => { setMode("signin"); setScreen("credentials"); setPassword(""); setRecoveryInput(""); resetMessages(); };
  const clearField = (key: keyof FieldErrors) => setErrors((current) => ({ ...current, [key]: undefined }));

  const task = async (operation: Busy, action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(operation);
    setError(null);
    setSuccess(null);
    try { await action(); }
    catch (failure) { setError(authErrorMessage(failure)); }
    finally { locked.current = false; setBusy(null); }
  };

  const signupErrors = (): FieldErrors => {
    const next: FieldErrors = {};
    if (name.trim().length < 2) next.name = "Profil adın en az 2 karakter olmalı.";
    if (!accepted) next.terms = "Devam etmek için kullanım koşullarını kabul et.";
    return next;
  };

  const emailSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next = mode === "signup" ? signupErrors() : {};
    if (!isValidEmail(normalizeEmail(email))) next.email = "Geçerli bir e-posta adresi yaz.";
    if (!password) next.password = "Şifreni yaz.";
    else if (mode === "signup" && !validPassword(password)) next.password = "Şifren en az 8 karakter, bir harf ve bir rakam içermeli.";
    setErrors(next);
    if (Object.keys(next).length) return;
    await task("email", async () => {
      if (mode === "signin") await login(email, password);
      else {
        const result = await signup({ email, password, displayName: name, country });
        if (result.recoveryCode) { setReceipt(result); setPassword(""); setSavedRecovery(false); }
      }
    });
  };

  const social = async (provider: "google" | "apple") => {
    if (mode === "signup") {
      const next: FieldErrors = accepted ? {} : { terms: "Devam etmek için kullanım koşullarını kabul et." };
      setErrors(next);
      if (Object.keys(next).length) return;
      try {
        if (name.trim().length >= 2) sessionStorage.setItem("atlasia.pendingName", name.trim());
        else sessionStorage.removeItem("atlasia.pendingName");
      } catch { /* Optional display name. */ }
    }
    await task(provider, async () => { await signInSocial(provider); });
  };

  const reset = async (event: FormEvent) => {
    event.preventDefault();
    const next: FieldErrors = {};
    if (!isValidEmail(normalizeEmail(email))) next.email = "Geçerli bir e-posta adresi yaz.";
    if (backend === "device") {
      if (recoveryInput.replace(/[\s-]/g, "").length !== 32) next.recovery = "Hesap oluştururken aldığın kurtarma anahtarını yaz.";
      if (!validPassword(password)) next.password = "En az 8 karakter, bir harf ve bir rakam kullan.";
    }
    setErrors(next);
    if (Object.keys(next).length) return;
    await task(backend === "device" ? "recovery" : "reset", async () => {
      if (backend === "device") {
        await resetDevicePassword(email, recoveryInput, password);
        setScreen("credentials");
        setMode("signin");
        setPassword("");
        setRecoveryInput("");
        setSuccess("Şifren yenilendi. Yeni şifrenle giriş yapabilirsin.");
      } else {
        await requestPasswordReset(email);
        setSuccess("Bu adrese kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi. Spam klasörünü de kontrol et.");
      }
    });
  };

  const sendCode = async (event?: FormEvent) => {
    event?.preventDefault();
    if (cooldown) return;
    const next = mode === "signup" ? signupErrors() : {};
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length < 7 || digits.length > 12) next.phone = "Numaranı ülke koduyla birlikte kontrol et.";
    setErrors(next);
    if (Object.keys(next).length) return;
    await task("phone", async () => {
      if (mode === "signup") { try { sessionStorage.setItem("atlasia.pendingName", name.trim()); } catch { /* Optional display name. */ } }
      verifier.current?.clear();
      verifier.current = new RecaptchaVerifier(getAtlasAuth(), "atlasia-recaptcha", { size: "invisible" });
      try {
        pendingPhone.current = await signInWithPhoneNumber(getAtlasAuth(), `${prefix}${digits}`, verifier.current);
        setScreen("code"); setCode(""); setCooldown(60);
      } catch (failure) { verifier.current?.clear(); verifier.current = null; throw failure; }
    });
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!pendingPhone.current || code.length !== 6) { setErrors({ code: "SMS'teki 6 haneli kodu yaz." }); return; }
    await task("code", async () => { await pendingPhone.current!.confirm(code); });
  };

  const emailField = <div className="auth-field"><label htmlFor="account-email">E-posta adresi</label><input id="account-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); clearField("email"); }} placeholder="ornek@gmail.com" disabled={blocked} aria-invalid={!!errors.email} aria-describedby={errors.email ? "account-email-error" : undefined} maxLength={254} /><FormError message={errors.email} id="account-email-error" /></div>;
  const profileFields = <>
    <div className="auth-field"><label htmlFor="account-name">Profil adın</label><input id="account-name" value={name} onChange={(event) => { setName(event.target.value); clearField("name"); }} autoComplete="nickname" placeholder="Adın veya takma adın" maxLength={40} disabled={blocked} aria-invalid={!!errors.name} aria-describedby={errors.name ? "account-name-error" : undefined} /><FormError message={errors.name} id="account-name-error" /></div>
    <div className="auth-field"><label htmlFor="account-country">Ülke / bölge</label><select id="account-country" value={country} onChange={(event) => setCountry(event.target.value)} disabled={blocked} autoComplete="country-name"><option>Türkiye</option><option>Kuzey Kıbrıs Türk Cumhuriyeti</option><option>Almanya</option><option>Birleşik Krallık</option><option>Amerika Birleşik Devletleri</option><option>Japonya</option><option>Diğer</option></select></div>
  </>;
  const consent = <div className="auth-consent-wrap"><label className="auth-consent"><input type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); clearField("terms"); }} disabled={blocked} /><span>Kullanım koşullarını ve gizlilik açıklamasını kabul ediyorum.</span></label><div className="auth-legal-links"><button type="button" onClick={() => setLegal("terms")}>Kullanım koşulları</button><span>·</span><button type="button" onClick={() => setLegal("privacy")}>Gizlilik açıklaması</button></div><FormError message={errors.terms} /></div>;
  const providers = <div className="auth-provider-actions auth-secondary-providers">
    <button type="button" disabled={blocked || !authConfigured} title={!authConfigured ? "Google bağlantısı henüz yapılandırılmadı" : undefined} onClick={() => void social("google")} className="auth-google">{busy === "google" ? <Loader2 className="animate-spin" size={17} /> : <GoogleMark />}<span>Google ile devam et</span></button>
    <button type="button" disabled={blocked || !authConfigured} title={!authConfigured ? "Apple bağlantısı henüz yapılandırılmadı" : undefined} onClick={() => void social("apple")} className="auth-apple">{busy === "apple" ? <Loader2 className="animate-spin" size={17} /> : <Apple size={20} fill="currentColor" />}<span>Apple ile devam et</span></button>
  </div>;

  if (receipt?.recoveryCode) return <AuthFrame><div className="auth-heading"><p className="auth-eyebrow">HESABIN OLUŞTURULDU</p><h2>Kurtarma anahtarını<br />sakla<span>.</span></h2><p>Şifreni unutursan bu anahtarla yenileyebilirsin. E-posta gönderimi olmadığı için anahtar yalnızca burada gösterilir.</p></div><BackendNote /><label className="auth-recovery-label" htmlFor="account-recovery-key">Kurtarma anahtarın</label><output id="account-recovery-key" className="auth-recovery-key">{receipt.recoveryCode}</output><button type="button" className="auth-recovery-copy" onClick={async () => { try { await navigator.clipboard.writeText(receipt.recoveryCode!); setCopyStatus("Anahtar kopyalandı."); } catch { setCopyStatus("Anahtarı seçip elle kopyalayabilirsin."); } }}><Copy size={15} />Anahtarı kopyala</button>{copyStatus && <p role="status" className="auth-form-hint">{copyStatus}</p>}<label className="auth-consent"><input type="checkbox" checked={savedRecovery} onChange={(event) => setSavedRecovery(event.target.checked)} /><span>Anahtarımı güvenli bir yere kaydettim.</span></label><button type="button" disabled={!savedRecovery || blocked} className="auth-submit" onClick={() => void task("finish", async () => { await receipt.finish?.(); })}>{busy === "finish" ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={17} />}Hesabımla devam et</button>{error && <Message>{error}</Message>}<p className="auth-form-hint">Bu anahtarı kimseyle paylaşma. Tarayıcı verilerin silinirse anahtar hesabı geri getiremez.</p></AuthFrame>;

  const heading = screen === "reset" ? "Şifreni sıfırla" : screen === "recovery" ? "Hesabını geri al" : screen === "code" ? "Telefonunu doğrula" : screen === "phone" ? "Telefonla giriş yap" : mode === "signup" ? "Atlasia’ya üye ol" : "Atlasia’ya giriş yap";
  return <>
    <AuthFrame signup={mode === "signup" && screen === "credentials"} onSwitch={switchMode} onLegal={setLegal}>
      <div className="auth-heading"><h2>{heading}<span>.</span></h2><p>{screen === "reset" ? "Kayıtlı e-posta adresine şifre yenileme bağlantısı gönderelim." : screen === "recovery" ? "Bu cihazda oluşturduğun hesabın kurtarma anahtarını kullan." : screen === "phone" || screen === "code" ? "Numaranı SMS koduyla doğrulayarak devam et." : mode === "signup" ? "Kendi izlerini ve rotalarını bir araya getir." : "Kaldığın yerden keşfetmeye devam et."}</p></div>
      <BackendNote />

      {screen === "credentials" && <>
        {mode === "signup" && <>{providers}<div className="auth-separator"><span />veya e-posta ile<span /></div></>}
        <form onSubmit={(event) => void emailSubmit(event)} noValidate className="auth-email-form">
          {emailField}
          <PasswordField id="account-password" value={password} onChange={(value) => { setPassword(value); clearField("password"); }} error={errors.password} fresh={mode === "signup"} disabled={blocked} forgot={mode === "signin" ? <button type="button" disabled={blocked} className="auth-forgot" onClick={() => { setScreen(backend === "device" ? "recovery" : "reset"); setPassword(""); resetMessages(); }}>Şifremi unuttum</button> : undefined} />
          {mode === "signup" && <>{profileFields}{consent}</>}
          <button className="auth-submit" type="submit" disabled={blocked}>{busy === "email" ? <Loader2 size={18} className="animate-spin" /> : mode === "signup" ? <ArrowRight size={16} /> : <LockKeyhole size={16} />}{busy === "email" ? "Lütfen bekle..." : mode === "signup" ? "Hesap oluştur" : "Giriş yap"}</button>
        </form>
        {mode === "signin" && <><div className="auth-separator"><span />veya<span /></div>{providers}</>}
        <button type="button" disabled={blocked || !authConfigured} onClick={() => { resetMessages(); setScreen("phone"); }} className="auth-phone-alternative"><Phone size={14} />Telefon numarasıyla giriş yap</button>
        {!authConfigured && <p className="auth-provider-note">Google, Apple ve SMS bağlantısı henüz etkin değil. Bu cihaza özel hesabın için e-posta ve şifre kullan.</p>}
        <p className="auth-bottom-switch">{mode === "signin" ? "Henüz hesabın yok mu?" : "Zaten hesabın var mı?"}<button type="button" disabled={blocked} onClick={switchMode}>{mode === "signin" ? "Üye ol" : "Giriş yap"}</button></p>
      </>}

      {(screen === "reset" || screen === "recovery") && <form className="auth-email-form" onSubmit={(event) => void reset(event)} noValidate>
        {emailField}
        {screen === "recovery" && <><div className="auth-field"><label htmlFor="account-recovery">Kurtarma anahtarın</label><input id="account-recovery" value={recoveryInput} onChange={(event) => { setRecoveryInput(event.target.value); clearField("recovery"); }} placeholder="XXXX-XXXX-XXXX-XXXX-..." autoComplete="off" spellCheck={false} disabled={blocked} aria-invalid={!!errors.recovery} aria-describedby={errors.recovery ? "account-recovery-error" : undefined} /><FormError id="account-recovery-error" message={errors.recovery} /></div><PasswordField id="account-new-password" label="Yeni şifre" fresh value={password} onChange={(value) => { setPassword(value); clearField("password"); }} error={errors.password} disabled={blocked} /></>}
        <button type="submit" disabled={blocked} className="auth-submit">{busy === "reset" || busy === "recovery" ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}{screen === "recovery" ? "Şifremi yenile" : "Sıfırlama bağlantısı gönder"}</button>
        <button type="button" disabled={blocked} className="auth-back auth-back-centered" onClick={backToLogin}><ArrowLeft size={14} />Giriş ekranına dön</button>
        {screen === "recovery" && <p className="auth-form-hint">Anahtarın yoksa bu modda e-posta ile kurtarma yapılamaz. Mevcut kayıtların silinmez; yeni hesap açmak onları aktarmaz.</p>}
      </form>}

      {screen === "phone" && <form className="auth-email-form" onSubmit={(event) => void sendCode(event)} noValidate>
        {mode === "signup" && profileFields}
        <div className="auth-field"><label htmlFor="account-phone">Telefon numaran</label><div className="auth-phone-input"><select value={prefix} onChange={(event) => setPrefix(event.target.value)} aria-label="Ülke kodu" disabled={blocked}><option value="+90">TR +90</option><option value="+1">US +1</option><option value="+44">UK +44</option><option value="+49">DE +49</option><option value="+33">FR +33</option><option value="+81">JP +81</option></select><input id="account-phone" type="tel" inputMode="tel" value={phone} onChange={(event) => { setPhone(event.target.value); clearField("phone"); }} autoComplete="tel-national" placeholder="5XX XXX XX XX" disabled={blocked} aria-invalid={!!errors.phone} /></div><FormError message={errors.phone} /></div>
        <p className="auth-form-hint">Numarana doğrulama SMS'i gönderilir. Standart SMS ücretleri uygulanabilir.</p>
        {mode === "signup" && consent}
        <button type="submit" disabled={blocked || cooldown > 0} className="auth-submit">{busy === "phone" ? <Loader2 size={18} className="animate-spin" /> : <Phone size={17} />}Doğrulama kodu gönder</button><button type="button" className="auth-back auth-back-centered" disabled={blocked} onClick={() => { setScreen("credentials"); resetMessages(); }}><ArrowLeft size={14} />Diğer giriş yöntemleri</button>
      </form>}

      {screen === "code" && <form className="auth-email-form" onSubmit={(event) => void verifyCode(event)} noValidate>
        <div className="auth-field"><label htmlFor="account-sms-code">6 haneli doğrulama kodu</label><input id="account-sms-code" className="auth-code-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); clearField("code"); }} maxLength={6} placeholder="000000" autoFocus disabled={blocked} aria-invalid={!!errors.code} /><FormError message={errors.code} /></div><p className="auth-form-hint">Kod, {prefix} {phone} numarasına gönderildi.</p><button type="submit" className="auth-submit" disabled={blocked || code.length !== 6}>{busy === "code" ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}Doğrula ve giriş yap</button><button type="button" className="auth-resend" disabled={blocked || cooldown > 0} onClick={() => void sendCode()}>{cooldown ? `${cooldown} saniye sonra yeniden gönder` : "Yeni kod gönder"}</button><button type="button" className="auth-back auth-back-centered" disabled={blocked} onClick={() => { setScreen("phone"); resetMessages(); }}><ArrowLeft size={14} />Numarayı değiştir</button>
      </form>}
      <div id="atlasia-recaptcha" />
      {(error || sessionError) && <Message>{error ?? sessionError}</Message>}
      {success && <Message success>{success}</Message>}
      {checking && <p className="auth-status" role="status"><Loader2 size={14} className="animate-spin" />Oturumun kontrol ediliyor...</p>}
    </AuthFrame>
    {legal && <LegalNotice type={legal} onClose={() => setLegal(null)} />}
  </>;
}

export function EmailVerification() {
  const { user, refreshSession, resendVerification, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown((n) => n - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  const check = async () => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    try { const account = await refreshSession(); if (account?.requiresEmailVerification) setNotice("E-posta henüz doğrulanmamış. Bağlantıyı açtıktan sonra tekrar kontrol et."); }
    catch (failure) { setError(authErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  const resend = async () => {
    setBusy(true); setError(null);
    try { await resendVerification(); setNotice("Doğrulama bağlantısı gönderildi. Spam klasörünü de kontrol et."); setCooldown(60); }
    catch (failure) { setError(authErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <AuthFrame><div className="auth-heading"><p className="auth-eyebrow">BİR ADIM KALDI</p><h2>E-postanı doğrula<span>.</span></h2><p>Hesabını açtık. Keşif haritasına geçmeden önce bu adresin sana ait olduğunu doğrula.</p></div><p className="auth-confirm-address"><Mail size={18} />{user?.email}</p><p className="auth-form-hint">Gelen kutundaki Atlasia doğrulama bağlantısını aç. Bağlantı gelmediyse aşağıdan yeniden gönderebilirsin.</p><button type="button" className="auth-submit" disabled={busy} onClick={() => void check()}>{busy ? <Loader2 className="animate-spin" size={17} /> : <ShieldCheck size={17} />}Doğrulamayı kontrol et</button><button type="button" className="auth-resend" disabled={busy || cooldown > 0} onClick={() => void resend()}>{cooldown ? `${cooldown} saniye sonra yeniden gönder` : "Doğrulama e-postasını gönder"}</button>{notice && <Message success>{notice}</Message>}{error && <Message>{error}</Message>}<button type="button" className="auth-back auth-back-centered" disabled={busy} onClick={() => void logout().catch((failure) => setError(authErrorMessage(failure)))}><ArrowLeft size={15} />Başka bir hesapla giriş yap</button></AuthFrame>;
}

export function ProfileSetup() {
  const { setName, logout } = useAuth();
  const [name, setNameInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try { await setName(name); }
    catch (failure) { setError(authErrorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <AuthFrame><div className="auth-heading"><p className="auth-eyebrow">SON BİR ADIM</p><h2>Seni nasıl tanıyalım<span>?</span></h2><p>İzlerinde görünecek profil adını ekle.</p></div><form onSubmit={(event) => void submit(event)}><div className="auth-field"><label htmlFor="complete-account-name">Profil adın</label><input id="complete-account-name" value={name} onChange={(event) => setNameInput(event.target.value)} autoComplete="nickname" maxLength={40} placeholder="Adın veya takma adın" autoFocus /></div><button type="submit" disabled={busy || name.trim().length < 2} className="auth-submit">{busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}Profili oluştur</button></form>{error && <Message>{error}</Message>}<button type="button" className="auth-back auth-back-centered" disabled={busy} onClick={() => void logout().catch((failure) => setError(authErrorMessage(failure)))}>Başka bir hesapla giriş yap</button></AuthFrame>;
}