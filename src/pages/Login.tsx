import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AnimatedSection from "@/components/AnimatedSection";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast({ title: "¡Cuenta creada!", description: "Revisa tu email para confirmar tu cuenta." });
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast({ title: "¡Bienvenida!" });
        navigate("/");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center pt-20 pb-12 px-6">
      <AnimatedSection className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 md:p-10 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <Link to="/" className="block text-center mb-8">
            <h1 className="font-playfair text-2xl font-bold text-carbon">
              Shenna <span className="text-gold">BROWS</span>
            </h1>
          </Link>

          <h2 className="font-playfair text-xl font-semibold text-carbon text-center mb-6">
            {isRegister ? "Crear cuenta" : "Iniciar sesión"}
          </h2>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-carbon/70 text-sm">Nombre</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" className="bg-cream/50 border-gold/15 focus:border-gold" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-carbon/70 text-sm">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="bg-cream/50 border-gold/15 focus:border-gold" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-carbon/70 text-sm">Contraseña</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-cream/50 border-gold/15 focus:border-gold" minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gold hover:bg-gold/90 text-white py-5 tracking-wide rounded-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isRegister ? "Registrarse" : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-carbon/50 mt-6">
            {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
            <button onClick={() => setIsRegister(!isRegister)} className="text-gold hover:underline font-medium">
              {isRegister ? "Inicia sesión" : "Regístrate"}
            </button>
          </p>
        </div>
      </AnimatedSection>
    </main>
  );
};

export default Login;
