import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Apple, ArrowLeft, ArrowRight, Check, CheckCircle2, Circle, Compass,
  Copy, Eye, EyeOff, Globe2, Info, KeyRound, Loader2, LockKeyhole,
  Mail, Monitor, Phone, ShieldCheck,
} from "lucide-react";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { useAuth, type SignupResult } from "../contexts/AuthContext";
import { authConfigured, authErrorMessage, getAtlasAuth, requestPasswordReset, signInSocial } from "../lib/auth";
import { AccountError, isValidEmail, normalizeEmail, passwordRules, validPassword } from "../lib/accountTypes";
import { checkPwnedPassword, estimatePasswordStrength, type PasswordExposure } from "../lib/passwordSecurity";
import { resetDevicePassword } from "../lib/deviceAccounts";
import { analytics } from "../lib/analytics";
// Kullanım koşulları/gizlilik metni yalnız ilgili bağlantıya basılınca açılır;
// ~19 KB'lik metin giriş ekranının başlangıç paketinde durmaz.
const LegalNotice = lazy(() => import("./LegalNotice"));

type Screen = "credentials" | "phone" | "code" | "reset" | "recovery";
type Busy = "email" | "google" | "apple" | "phone" | "code" | "reset" | "recovery" | "finish";
type FieldErrors = Partial<Record<"email" | "password" | "name" | "terms" | "phone" | "code" | "recovery", string>>;
const LANDSCAPE = "https://images.pexels.com/photos/19139425/pexels-photo-19139425.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1600&w=2400";
const APPLE_AUTH_ENABLED = import.meta.env.VITE_APPLE_AUTH_ENABLED === "true";
const PHONE_AUTH_ENABLED = import.meta.env.VITE_PHONE_AUTH_ENABLED === "true";

function GoogleMark() {
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.37Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.5c-.9.6-2.07.97-3.38.97-2.6 0-4.8-1.76-5.6-4.12H3.05v2.58A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.95A6 6 0 0 1 6.08 12c0-.68.12-1.34.32-1.95V7.47H3.05A10 10 0 0 0 2 12c0 1.61.38 3.14 1.05 4.53l3.35-2.58Z"/><path fill="#EA4335" d="M12 5.93c1.47 0 2.79.5 3.83 1.52l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.95 5.47l3.35 2.58c.8-2.36 3-4.12 5.6-4.12Z"/></svg>;
}

function AuthFrame({ signup = false, children, onSwitch, onLegal }: {
  signup?: boolean;
  children: ReactNode;
  onSwitch?: () => void;
  onLegal?: (type: "privacy" | "terms" | "kvkk") => void;
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
      <footer className="auth-access-footer"><p>© {new Date().getFullYear()} Atlasia</p><div>{onLegal ? <><button type="button" onClick={() => onLegal("privacy")}>Gizlilik</button><span>·</span><button type="button" onClick={() => onLegal("terms")}>Koşullar</button><span>·</span><button type="button" onClick={() => onLegal("kvkk")}>KVKK</button></> : <span>{backend === "device" ? "Bu cihaza özel hesap" : "Firebase Authentication"}</span>}</div></footer>
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

function PasswordField({ id, label = "Şifre", value, onChange, error, fresh = false, forgot, disabled = false, exposure = { status: "idle" } }: {
  id: string; label?: string; value: string; onChange: (value: string) => void;
  error?: string; fresh?: boolean; forgot?: ReactNode; disabled?: boolean; exposure?: PasswordExposure;
}) {
  const [visible, setVisible] = useState(false);
  const rules = passwordRules(value);
  const strength = estimatePasswordStrength(value);
  const describedBy = [error ? `${id}-error` : null, fresh ? `${id}-help ${id}-exposure` : null].filter(Boolean).join(" ") || undefined;
  const exposureMessage = exposure.status === "checking"
    ? <><Loader2 size={13} className="animate-spin" />Bilinen sızıntı kayıtları kontrol ediliyor…</>
    : exposure.status === "exposed"
      ? <><Info size={13} />Bu şifre bilinen veri sızıntılarında {exposure.count.toLocaleString("tr-TR")} kez görülmüş. Başka bir şifre seç.</>
      : exposure.status === "safe"
        ? <><CheckCircle2 size={13} />Bilinen sızıntı kayıtlarında eşleşme bulunmadı. Bu sonuç güvenlik garantisi değildir.</>
        : exposure.status === "unavailable"
          ? <><Info size={13} />Sızıntı kontrolü şu anda kullanılamıyor. Devam edebilirsin; güçlü ve başka yerde kullanmadığın bir şifre seç.</>
          : null;

  return <div className="auth-field">
    <div className="auth-field-label"><label htmlFor={id}>{label}</label>{forgot}</div>
    <div className="auth-input-with-action">
      <input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={fresh ? "new-password" : "current-password"} maxLength={128} disabled={disabled} aria-invalid={!!error} aria-describedby={describedBy} />
      <button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={visible} className="auth-input-action">{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button>
    </div>
    <FormError message={error} id={`${id}-error`} />
    {fresh && <div id={`${id}-help`} className="auth-password-help">
      <div className="auth-password-strength" data-score={strength.score}>
        <div className="auth-password-strength-copy"><span>Tahmini şifre gücü</span><strong>{strength.label}</strong></div>
        <div className="auth-password-meter" role="meter" aria-label="Tahmini şifre gücü" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength.score} aria-valuetext={strength.label}>
          {[1, 2, 3, 4].map((segment) => <span key={segment} data-active={segment <= strength.score} />)}
        </div>
      </div>
      <ul>{[["length", "8–128 karakter"], ["letter", "En az bir harf"], ["number", "En az bir rakam"]].map(([key, text]) => <li key={key} data-valid={rules[key as keyof typeof rules]}>{rules[key as keyof typeof rules] ? <Check size={13} /> : <Circle size={11} />}{text}</li>)}</ul>
      <p>Atlasia için ayrı bir şifre seç; Google veya Apple şifreni kullanma.</p>
      <p className="auth-password-privacy">Sızıntı kontrolü cihazında yapılır. Ağa yalnız SHA-1 özetinin ilk 5 karakteri gönderilir; ham şifren ve tam özet gönderilmez.</p>
      <p id={`${id}-exposure`} className={`auth-password-exposure auth-password-exposure-${exposure.status}`} aria-live="polite">{exposureMessage}</p>
    </div>}
  </div>;
}

export default function AccountAccess() {
  const { backend, checking, error: sessionError, login, signup } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  // T2 huni adımı: kayıt formu ilk kez açıldığında bir kez sayılır.
  useEffect(() => {
    if (mode === "signup") analytics.signupStart();
  }, [mode]);
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
  const [legal, setLegal] = useState<"privacy" | "terms" | "kvkk" | null>(null);
  const [phone, setPhone] = useState("");
  const [prefix, setPrefix] = useState("+90");
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [recoveryInput, setRecoveryInput] = useState("");
  const [receipt, setReceipt] = useState<SignupResult | null>(null);
  const [savedRecovery, setSavedRecovery] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [passwordExposure, setPasswordExposure] = useState<PasswordExposure>({ status: "idle" });
  const pendingPhone = useRef<ConfirmationResult | null>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const passwordCheckSequence = useRef(0);
  const locked = useRef(false);
  const blocked = !!busy || checking;
  const checksFreshPassword = (mode === "signup" && screen === "credentials") || (backend === "device" && screen === "recovery");

  useEffect(() => () => verifier.current?.clear(), []);
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown((current) => current - 1), 1000); return () => clearTimeout(timer); }, [cooldown]);
  useEffect(() => {
    const request = ++passwordCheckSequence.current;
    const rules = passwordRules(password);
    if (!checksFreshPassword || !password || !Object.values(rules).every(Boolean)) {
      setPasswordExposure({ status: "idle" });
      return;
    }

    const controller = new AbortController();
    setPasswordExposure({ status: "idle" });
    const timer = setTimeout(() => {
      if (request !== passwordCheckSequence.current) return;
      setPasswordExposure({ status: "checking" });
      void checkPwnedPassword(password, { signal: controller.signal }).then((result) => {
        if (!controller.signal.aborted && request === passwordCheckSequence.current) setPasswordExposure(result);
      });
    }, 450);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [checksFreshPassword, password]);

  const resetMessages = () => { setErrors({}); setError(null); setSuccess(null); };
  const switchMode = () => { setMode((current) => current === "signin" ? "signup" : "signin"); setScreen("credentials"); setPassword(""); setReceipt(null); resetMessages(); };
  const backToLogin = () => { setMode("signin"); setScreen("credentials"); setPassword(""); setRecoveryInput(""); resetMessages(); };
  const clearField = (key: keyof FieldErrors) => setErrors((current) => ({ ...current, [key]: undefined }));
  const verifyPasswordBeforeWrite = async () => {
    const request = ++passwordCheckSequence.current;
    setPasswordExposure({ status: "checking" });
    const result = await checkPwnedPassword(password);
    if (request === passwordCheckSequence.current) setPasswordExposure(result);
    if (result.status !== "exposed") return;

    const failure = new AccountError("auth/password-exposed");
    setErrors((current) => ({ ...current, password: authErrorMessage(failure) }));
    throw failure;
  };

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
        await verifyPasswordBeforeWrite();
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
    await task(provider, async () => {
      const credential = await signInSocial(provider);
      // Yönlendirmeli akışta sonuç burada dönmez (null); o durumda sayım
      // yapılmaz, oturum açılışı bir sonraki açılışta `session_start` ile görünür.
      if (credential) analytics.signIn({ account: "cloud", method: provider });
    });
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
        await verifyPasswordBeforeWrite();
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
    if (!PHONE_AUTH_ENABLED) return;
    if (cooldown) return;
    const next = mode === "signup" ? signupErrors() : {};
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length < 7 || digits.length > 12) next.phone = "Numaranı ülke koduyla birlikte kontrol et.";
    setErrors(next);
    if (Object.keys(next).length) return;
    await task("phone", async () => {
      if (mode === "signup") { try { sessionStorage.setItem("atlasia.pendingName", name.trim()); } catch { /* Optional display name. */ } }
      verifier.current?.clear();
      const [{ RecaptchaVerifier, signInWithPhoneNumber }, auth] = await Promise.all([
        import("firebase/auth"),
        getAtlasAuth(),
      ]);
      verifier.current = new RecaptchaVerifier(auth, "atlasia-recaptcha", { size: "invisible" });
      try {
        pendingPhone.current = await signInWithPhoneNumber(auth, `${prefix}${digits}`, verifier.current);
        setScreen("code"); setCode(""); setCooldown(60);
      } catch (failure) { verifier.current?.clear(); verifier.current = null; throw failure; }
    });
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!PHONE_AUTH_ENABLED) return;
    if (!pendingPhone.current || code.length !== 6) { setErrors({ code: "SMS'teki 6 haneli kodu yaz." }); return; }
    await task("code", async () => { await pendingPhone.current!.confirm(code); });
  };

  const emailField = <div className="auth-field"><label htmlFor="account-email">E-posta adresi</label><input id="account-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); clearField("email"); }} placeholder="ornek@gmail.com" disabled={blocked} aria-invalid={!!errors.email} aria-describedby={errors.email ? "account-email-error" : undefined} maxLength={254} /><FormError message={errors.email} id="account-email-error" /></div>;
  const profileFields = <>
    <div className="auth-field"><label htmlFor="account-name">Profil adın</label><input id="account-name" value={name} onChange={(event) => { setName(event.target.value); clearField("name"); }} autoComplete="nickname" placeholder="Adın veya takma adın" maxLength={40} disabled={blocked} aria-invalid={!!errors.name} aria-describedby={errors.name ? "account-name-error" : undefined} /><FormError message={errors.name} id="account-name-error" /></div>
    <div className="auth-field"><label htmlFor="account-country">Ülke / bölge</label><select id="account-country" value={country} onChange={(event) => setCountry(event.target.value)} disabled={blocked} autoComplete="country-name"><option>Türkiye</option><option>Kuzey Kıbrıs Türk Cumhuriyeti</option><option>Almanya</option><option>Birleşik Krallık</option><option>Amerika Birleşik Devletleri</option><option>Japonya</option><option>Diğer</option></select></div>
  </>;
  const consent = <div className="auth-consent-wrap"><label className="auth-consent"><input type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); clearField("terms"); }} disabled={blocked} /><span>Kullanım koşullarını kabul ediyorum.</span></label><div className="auth-legal-links"><span>KVKK aydınlatma metnini okudum</span><button type="button" onClick={() => setLegal("kvkk")}>Metni görüntüle</button></div><div className="auth-legal-links"><button type="button" onClick={() => setLegal("terms")}>Kullanım koşulları</button><span>·</span><button type="button" onClick={() => setLegal("privacy")}>Gizlilik açıklaması</button></div><FormError message={errors.terms} /></div>;
  // T9 — birincil yol sosyal giriş. Kural: çalışmayan sağlayıcı HİÇ gösterilmez.
  // Önceden kapalı "Apple ile giriş yakında" düğmesi tıklanabilir görünüp
  // hayal kırıklığı yaratıyordu; artık Apple kapalıyken yerine e-posta formunda
  // mikro metin var. Yapılandırma yoksa (cihaz hesabı) hiç sosyal düğme yok.
  const socialButtons = [
    authConfigured ? <button key="google" type="button" disabled={blocked} onClick={() => void social("google")} className="auth-google">{busy === "google" ? <Loader2 className="animate-spin" size={17} /> : <GoogleMark />}<span>Google ile devam et</span></button> : null,
    authConfigured && APPLE_AUTH_ENABLED ? <button key="apple" type="button" disabled={blocked} onClick={() => void social("apple")} className="auth-apple">{busy === "apple" ? <Loader2 className="animate-spin" size={17} /> : <Apple size={20} fill="currentColor" />}<span>Apple ile devam et</span></button> : null,
  ].filter((button) => button !== null);
  const providers = socialButtons.length
    ? <div className="auth-provider-actions">{socialButtons}</div>
    : null;
  if (receipt?.recoveryCode) return <AuthFrame><div className="auth-heading"><p className="auth-eyebrow">HESABIN OLUŞTURULDU</p><h2>Kurtarma anahtarını<br />sakla<span>.</span></h2><p>Şifreni unutursan bu anahtarla yenileyebilirsin. E-posta gönderimi olmadığı için anahtar yalnızca burada gösterilir.</p></div><BackendNote /><label className="auth-recovery-label" htmlFor="account-recovery-key">Kurtarma anahtarın</label><output id="account-recovery-key" className="auth-recovery-key">{receipt.recoveryCode}</output><button type="button" className="auth-recovery-copy" onClick={async () => { try { await navigator.clipboard.writeText(receipt.recoveryCode!); setCopyStatus("Anahtar kopyalandı."); } catch { setCopyStatus("Anahtarı seçip elle kopyalayabilirsin."); } }}><Copy size={15} />Anahtarı kopyala</button>{copyStatus && <p role="status" className="auth-form-hint">{copyStatus}</p>}<label className="auth-consent"><input type="checkbox" checked={savedRecovery} onChange={(event) => setSavedRecovery(event.target.checked)} /><span>Anahtarımı güvenli bir yere kaydettim.</span></label><button type="button" disabled={!savedRecovery || blocked} className="auth-submit" onClick={() => void task("finish", async () => { await receipt.finish?.(); })}>{busy === "finish" ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={17} />}Hesabımla devam et</button>{error && <Message>{error}</Message>}<p className="auth-form-hint">Bu anahtarı kimseyle paylaşma. Tarayıcı verilerin silinirse anahtar hesabı geri getiremez.</p></AuthFrame>;

  const heading = screen === "reset" ? "Şifreni sıfırla" : screen === "recovery" ? "Hesabını geri al" : screen === "code" ? "Telefonunu doğrula" : screen === "phone" ? "Telefonla giriş yap" : mode === "signup" ? "Atlasia’ya üye ol" : "Atlasia’ya giriş yap";
  return <>
    <AuthFrame signup={mode === "signup" && screen === "credentials"} onSwitch={switchMode} onLegal={setLegal}>
      <div className="auth-heading"><h2>{heading}<span>.</span></h2><p>{screen === "reset" ? "Kayıtlı e-posta adresine şifre yenileme bağlantısı gönderelim." : screen === "recovery" ? "Bu cihazda oluşturduğun hesabın kurtarma anahtarını kullan." : screen === "phone" || screen === "code" ? "Numaranı SMS koduyla doğrulayarak devam et." : mode === "signup" ? "Kendi izlerini ve rotalarını bir araya getir." : "Kaldığın yerden keşfetmeye devam et."}</p></div>
      <BackendNote />

      {screen === "credentials" && <>
        {/* T9: sağlayıcılar her iki modda da formun ÜSTÜNDE; e-posta "veya" altında. */}
        {providers && <>{providers}<div className="auth-separator"><span />veya e-posta ile<span /></div></>}
        <form onSubmit={(event) => void emailSubmit(event)} noValidate className="auth-email-form">
          {emailField}
          <PasswordField id="account-password" value={password} onChange={(value) => { setPassword(value); clearField("password"); }} error={errors.password} fresh={mode === "signup"} exposure={passwordExposure} disabled={blocked} forgot={mode === "signin" ? <button type="button" disabled={blocked} className="auth-forgot" onClick={() => { setScreen(backend === "device" ? "recovery" : "reset"); setPassword(""); resetMessages(); }}>Şifremi unuttum</button> : undefined} />
          {mode === "signup" && <>{profileFields}{consent}</>}
          <button className="auth-submit" type="submit" disabled={blocked}>{busy === "email" ? <Loader2 size={18} className="animate-spin" /> : mode === "signup" ? <ArrowRight size={16} /> : <LockKeyhole size={16} />}{busy === "email" ? "Lütfen bekle..." : mode === "signup" ? "Hesap oluştur" : "Giriş yap"}</button>
        </form>
        {authConfigured && !APPLE_AUTH_ENABLED && <p className="auth-form-hint">Apple ile giriş yakında. Şimdilik Google veya e-posta ile devam edebilirsin.</p>}
        {PHONE_AUTH_ENABLED && <button type="button" disabled={blocked || !authConfigured} onClick={() => { resetMessages(); setScreen("phone"); }} className="auth-phone-alternative"><Phone size={14} />Telefon numarasıyla giriş yap</button>}
        {!authConfigured && <p className="auth-provider-note">{APPLE_AUTH_ENABLED ? "Google ve Apple bağlantısı henüz etkin değil." : "Google bağlantısı henüz etkin değil."} Bu cihaza özel hesabın için e-posta ve şifre kullan.</p>}
        <p className="auth-bottom-switch">{mode === "signin" ? "Henüz hesabın yok mu?" : "Zaten hesabın var mı?"}<button type="button" disabled={blocked} onClick={switchMode}>{mode === "signin" ? "Üye ol" : "Giriş yap"}</button></p>
      </>}

      {(screen === "reset" || screen === "recovery") && <form className="auth-email-form" onSubmit={(event) => void reset(event)} noValidate>
        {emailField}
        {screen === "recovery" && <><div className="auth-field"><label htmlFor="account-recovery">Kurtarma anahtarın</label><input id="account-recovery" value={recoveryInput} onChange={(event) => { setRecoveryInput(event.target.value); clearField("recovery"); }} placeholder="XXXX-XXXX-XXXX-XXXX-..." autoComplete="off" spellCheck={false} disabled={blocked} aria-invalid={!!errors.recovery} aria-describedby={errors.recovery ? "account-recovery-error" : undefined} /><FormError id="account-recovery-error" message={errors.recovery} /></div><PasswordField id="account-new-password" label="Yeni şifre" fresh value={password} onChange={(value) => { setPassword(value); clearField("password"); }} error={errors.password} exposure={passwordExposure} disabled={blocked} /></>}
        <button type="submit" disabled={blocked} className="auth-submit">{busy === "reset" || busy === "recovery" ? <Loader2 size={17} className="animate-spin" /> : <KeyRound size={17} />}{screen === "recovery" ? "Şifremi yenile" : "Sıfırlama bağlantısı gönder"}</button>
        <button type="button" disabled={blocked} className="auth-back auth-back-centered" onClick={backToLogin}><ArrowLeft size={14} />Giriş ekranına dön</button>
        {screen === "recovery" && <p className="auth-form-hint">Anahtarın yoksa bu modda e-posta ile kurtarma yapılamaz. Mevcut kayıtların silinmez; yeni hesap açmak onları aktarmaz.</p>}
      </form>}

      {PHONE_AUTH_ENABLED && screen === "phone" && <form className="auth-email-form" onSubmit={(event) => void sendCode(event)} noValidate>
        {mode === "signup" && profileFields}
        <div className="auth-field"><label htmlFor="account-phone">Telefon numaran</label><div className="auth-phone-input"><select value={prefix} onChange={(event) => setPrefix(event.target.value)} aria-label="Ülke kodu" disabled={blocked}><option value="+90">TR +90</option><option value="+1">US +1</option><option value="+44">UK +44</option><option value="+49">DE +49</option><option value="+33">FR +33</option><option value="+81">JP +81</option></select><input id="account-phone" type="tel" inputMode="tel" value={phone} onChange={(event) => { setPhone(event.target.value); clearField("phone"); }} autoComplete="tel-national" placeholder="5XX XXX XX XX" disabled={blocked} aria-invalid={!!errors.phone} /></div><FormError message={errors.phone} /></div>
        <p className="auth-form-hint">Numarana doğrulama SMS’i gönderilir. Google reCAPTCHA, kötüye kullanımı azaltmak için cihaz ve etkileşim sinyallerini otomatik olarak doğrulayabilir; bu kontrol mutlak güvenlik garantisi vermez. Standart SMS ücretleri uygulanabilir.</p>
        {mode === "signup" && consent}
        <button type="submit" disabled={blocked || cooldown > 0} className="auth-submit">{busy === "phone" ? <Loader2 size={18} className="animate-spin" /> : <Phone size={17} />}Doğrulama kodu gönder</button><button type="button" className="auth-back auth-back-centered" disabled={blocked} onClick={() => { setScreen("credentials"); resetMessages(); }}><ArrowLeft size={14} />Diğer giriş yöntemleri</button>
      </form>}

      {PHONE_AUTH_ENABLED && screen === "code" && <form className="auth-email-form" onSubmit={(event) => void verifyCode(event)} noValidate>
        <div className="auth-field"><label htmlFor="account-sms-code">6 haneli doğrulama kodu</label><input id="account-sms-code" className="auth-code-input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(event) => { setCode(event.target.value.replace(/\D/g, "").slice(0, 6)); clearField("code"); }} maxLength={6} placeholder="000000" autoFocus disabled={blocked} aria-invalid={!!errors.code} /><FormError message={errors.code} /></div><p className="auth-form-hint">Kod, {prefix} {phone} numarasına gönderildi.</p><button type="submit" className="auth-submit" disabled={blocked || code.length !== 6}>{busy === "code" ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}Doğrula ve giriş yap</button><button type="button" className="auth-resend" disabled={blocked || cooldown > 0} onClick={() => void sendCode()}>{cooldown ? `${cooldown} saniye sonra yeniden gönder` : "Yeni kod gönder"}</button><button type="button" className="auth-back auth-back-centered" disabled={blocked} onClick={() => { setScreen("phone"); resetMessages(); }}><ArrowLeft size={14} />Numarayı değiştir</button>
      </form>}
      <div id="atlasia-recaptcha" />
      {(error || sessionError) && <Message>{error ?? sessionError}</Message>}
      {success && <Message success>{success}</Message>}
      {checking && <p className="auth-status" role="status"><Loader2 size={14} className="animate-spin" />Oturumun kontrol ediliyor...</p>}
    </AuthFrame>
    {legal && (
      <Suspense fallback={null}>
        <LegalNotice type={legal} onClose={() => setLegal(null)} />
      </Suspense>
    )}
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