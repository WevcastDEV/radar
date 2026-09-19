'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function CadastroPage() {
  const router = useRouter(); const [form, setForm] = useState({name:'',email:'',password:'',question:'',answer:''}); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const change=(key:string)=>(e:React.ChangeEvent<HTMLInputElement>)=>setForm({...form,[key]:e.target.value});
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{await api.post('/auth/register',{name:form.name,email:form.email,password:form.password,securityQuestion:form.question,securityAnswer:form.answer});router.push('/login');}catch(err:any){setError(err.response?.data?.message||'Não foi possível criar o cadastro.');}finally{setBusy(false);}}
  return <main className="min-h-screen flex items-center justify-center bg-muted/30 p-4"><form onSubmit={submit} className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl space-y-4"><div><h1 className="text-2xl font-bold">Criar acesso</h1><p className="text-sm text-muted-foreground">Use seus dados para acessar a plataforma.</p></div>{error&&<p className="text-sm text-destructive">{error}</p>}<Input placeholder="Nome completo" value={form.name} onChange={change('name')} required/><Input type="email" placeholder="E-mail" value={form.email} onChange={change('email')} required/><Input type="password" minLength={8} placeholder="Senha (mínimo 8 caracteres)" value={form.password} onChange={change('password')} required/><div className="border-t pt-4 space-y-2"><p className="text-sm font-semibold">Pergunta-chave para recuperação</p><Input placeholder="Ex.: Qual era o nome do seu primeiro projeto?" value={form.question} onChange={change('question')} required/><Input placeholder="Resposta-chave" value={form.answer} onChange={change('answer')} required/></div><Button className="w-full" disabled={busy}>{busy?'Criando...':'Criar cadastro'}</Button><a href="/login" className="block text-center text-sm text-primary hover:underline">Voltar ao login</a></form></main>;
}
