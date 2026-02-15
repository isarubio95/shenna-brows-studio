import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AnimatedSection from "@/components/AnimatedSection";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);

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

          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-carbon/70 text-sm">Nombre</Label>
                <Input id="name" placeholder="Tu nombre" className="bg-cream/50 border-gold/15 focus:border-gold" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-carbon/70 text-sm">Email</Label>
              <Input id="email" type="email" placeholder="tu@email.com" className="bg-cream/50 border-gold/15 focus:border-gold" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-carbon/70 text-sm">Contraseña</Label>
              <Input id="password" type="password" placeholder="••••••••" className="bg-cream/50 border-gold/15 focus:border-gold" />
            </div>
            <Button
              type="submit"
              className="w-full bg-gold hover:bg-gold/90 text-white py-5 tracking-wide rounded-full"
            >
              {isRegister ? "Registrarse" : "Entrar"}
            </Button>
          </form>

          <p className="text-center text-sm text-carbon/50 mt-6">
            {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-gold hover:underline font-medium"
            >
              {isRegister ? "Inicia sesión" : "Regístrate"}
            </button>
          </p>

          <p className="text-xs text-carbon/30 text-center mt-4">
            La autenticación se conectará cuando se active el backend.
          </p>
        </div>
      </AnimatedSection>
    </main>
  );
};

export default Login;
