using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace RadarLauncher
{
    static class Program
    {
        private static Mutex singleInstanceMutex = null;

        [STAThread]
        static void Main()
        {
            bool isFirstInstance = false;
            try
            {
                singleInstanceMutex = new Mutex(true, "RadarDeOportunidades_WCTech_Launcher_Mutex", out isFirstInstance);
            }
            catch
            {
                isFirstInstance = true;
            }

            if (!isFirstInstance)
            {
                // Já existe uma instância do launcher em execução
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SplashForm());

            GC.KeepAlive(singleInstanceMutex);
        }
    }

    public class SplashForm : Form
    {
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblStatus;
        private ProgressBar progressBar;
        private Label lblSkip;
        private string projectDir = "";
        private volatile bool isClosing = false;

        public SplashForm()
        {
            FindProjectDirectory();
            InitializeComponent();
            Shown += SplashForm_Shown;
        }

        private void InitializeComponent()
        {
            this.Text = "Radar de Oportunidades PRO";
            this.FormBorderStyle = FormBorderStyle.None;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Size = new Size(500, 250);
            this.BackColor = Color.FromArgb(15, 23, 42); // slate-900
            this.ForeColor = Color.White;
            this.TopMost = true;

            string iconPath = Path.Combine(projectDir, "radar.ico");
            if (File.Exists(iconPath))
            {
                try { this.Icon = new Icon(iconPath); } catch { }
            }

            // Borda cyan/azul moderna
            this.Paint += (s, e) =>
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                using (Pen p = new Pen(Color.FromArgb(56, 189, 248), 2))
                {
                    e.Graphics.DrawRectangle(p, 1, 1, this.Width - 2, this.Height - 2);
                }
            };

            // Radar Badge / Ícone estilizado
            PictureBox pic = new PictureBox();
            pic.Location = new Point(24, 28);
            pic.Size = new Size(54, 54);
            pic.SizeMode = PictureBoxSizeMode.Zoom;
            pic.Paint += (s, e) =>
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                using (SolidBrush b = new SolidBrush(Color.FromArgb(30, 41, 59)))
                {
                    e.Graphics.FillEllipse(b, 2, 2, 50, 50);
                }
                using (Pen p = new Pen(Color.FromArgb(14, 165, 233), 2))
                {
                    e.Graphics.DrawEllipse(p, 8, 8, 38, 38);
                    e.Graphics.DrawEllipse(p, 16, 16, 22, 22);
                    e.Graphics.DrawLine(p, 27, 8, 27, 46);
                    e.Graphics.DrawLine(p, 8, 27, 46, 27);
                }
                using (SolidBrush dot = new SolidBrush(Color.FromArgb(34, 197, 94)))
                {
                    e.Graphics.FillEllipse(dot, 32, 16, 8, 8);
                }
            };
            this.Controls.Add(pic);

            // Título
            lblTitle = new Label();
            lblTitle.Text = "Radar de Oportunidades PRO";
            lblTitle.Font = new Font("Segoe UI", 15, FontStyle.Bold);
            lblTitle.ForeColor = Color.FromArgb(248, 250, 252);
            lblTitle.Location = new Point(90, 26);
            lblTitle.AutoSize = true;
            this.Controls.Add(lblTitle);

            // Subtítulo
            lblSubtitle = new Label();
            lblSubtitle.Text = "Plataforma B2B | Powered by WCTECH";
            lblSubtitle.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            lblSubtitle.ForeColor = Color.FromArgb(148, 163, 184);
            lblSubtitle.Location = new Point(92, 58);
            lblSubtitle.AutoSize = true;
            this.Controls.Add(lblSubtitle);

            // Status Label
            lblStatus = new Label();
            lblStatus.Text = "Iniciando sistema...";
            lblStatus.Font = new Font("Segoe UI", 10, FontStyle.Regular);
            lblStatus.ForeColor = Color.FromArgb(56, 189, 248);
            lblStatus.Location = new Point(30, 115);
            lblStatus.Size = new Size(440, 24);
            this.Controls.Add(lblStatus);

            // Progress Bar Marquee animada
            progressBar = new ProgressBar();
            progressBar.Location = new Point(30, 145);
            progressBar.Size = new Size(440, 12);
            progressBar.Style = ProgressBarStyle.Marquee;
            progressBar.MarqueeAnimationSpeed = 25;
            this.Controls.Add(progressBar);

            // Botão Fechar (X)
            Label lblClose = new Label();
            lblClose.Text = "✕";
            lblClose.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            lblClose.ForeColor = Color.FromArgb(148, 163, 184);
            lblClose.Location = new Point(470, 8);
            lblClose.Size = new Size(22, 22);
            lblClose.Cursor = Cursors.Hand;
            lblClose.Click += (s, e) => { isClosing = true; this.Close(); };
            this.Controls.Add(lblClose);

            // Rodapé
            Label lblBottom = new Label();
            lblBottom.Text = "Weverton Castelo Branco • Inicialização Rápida";
            lblBottom.Font = new Font("Segoe UI", 8, FontStyle.Regular);
            lblBottom.ForeColor = Color.FromArgb(100, 116, 139);
            lblBottom.Location = new Point(30, 205);
            lblBottom.AutoSize = true;
            this.Controls.Add(lblBottom);

            // Botão "Abrir Agora ➜"
            lblSkip = new Label();
            lblSkip.Text = "Abrir Agora ➜";
            lblSkip.Font = new Font("Segoe UI", 9, FontStyle.Underline);
            lblSkip.ForeColor = Color.FromArgb(56, 189, 248);
            lblSkip.Location = new Point(390, 203);
            lblSkip.AutoSize = true;
            lblSkip.Cursor = Cursors.Hand;
            lblSkip.Click += (s, e) => {
                isClosing = true;
                OpenBrowser("http://localhost:3000/login");
                CloseForm();
            };
            this.Controls.Add(lblSkip);
        }

        private void FindProjectDirectory()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string userProfile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);

            System.Collections.Generic.List<string> candidates = new System.Collections.Generic.List<string>
            {
                baseDir,
                Directory.GetCurrentDirectory(),
                Path.Combine(baseDir, "radar-de-oportunidades"),
                Path.Combine(baseDir, "Nova pasta\\radar-de-oportunidades"),
                Path.Combine(desktopDir, "Nova pasta\\radar-de-oportunidades"),
                Path.Combine(desktopDir, "radar-de-oportunidades"),
                Path.Combine(userProfile, @"OneDrive\Desktop\Nova pasta\radar-de-oportunidades"),
                Path.Combine(userProfile, @"OneDrive\Desktop\PASTA BACKUP\radar-de-oportunidades"),
                Path.Combine(userProfile, @"Desktop\Nova pasta\radar-de-oportunidades"),
                Path.Combine(baseDir, @"PASTA BACKUP\radar-de-oportunidades")
            };

            try
            {
                DirectoryInfo parent = Directory.GetParent(baseDir);
                if (parent != null)
                {
                    candidates.Add(parent.FullName);
                    candidates.Add(Path.Combine(parent.FullName, "radar-de-oportunidades"));
                    candidates.Add(Path.Combine(parent.FullName, "Nova pasta\\radar-de-oportunidades"));
                }
            }
            catch { }

            foreach (string c in candidates)
            {
                if (!string.IsNullOrEmpty(c) && Directory.Exists(c) && File.Exists(Path.Combine(c, "package.json")) && Directory.Exists(Path.Combine(c, "apps")))
                {
                    projectDir = c;
                    break;
                }
            }

            if (string.IsNullOrEmpty(projectDir))
            {
                projectDir = baseDir;
            }
        }

        private bool IsNodeInstalled()
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", "/c node -v");
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.RedirectStandardOutput = true;
                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(3000);
                    return p.ExitCode == 0;
                }
            }
            catch
            {
                return false;
            }
        }

        private void SplashForm_Shown(object sender, EventArgs e)
        {
            Thread worker = new Thread(RunStartupSequence);
            worker.IsBackground = true;
            worker.Start();
        }

        private void UpdateStatus(string message)
        {
            if (isClosing) return;
            if (InvokeRequired)
            {
                try { Invoke(new Action<string>(UpdateStatus), message); } catch { }
                return;
            }
            lblStatus.Text = message;
        }

        private void RunStartupSequence()
        {
            try
            {
                // 0. Validação do Node.js (Zero dependência de Docker)
                UpdateStatus("Verificando ambiente local (Node.js)...");
                if (!IsNodeInstalled())
                {
                    UpdateStatus("Node.js não detectado no sistema!");
                    DialogResult res = MessageBox.Show(
                        "O Node.js não foi encontrado neste computador!\n\n" +
                        "O Radar de Oportunidades é 100% autônomo com SQLite local e não necessita de Docker.\n" +
                        "Ele precisa apenas do Node.js (versão 20 LTS ou superior) instalado no sistema operacional.\n\n" +
                        "Deseja abrir o site oficial do Node.js para instalar agora?",
                        "Radar de Oportunidades PRO - Node.js Necessário",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Information
                    );
                    if (res == DialogResult.Yes)
                    {
                        OpenBrowser("https://nodejs.org/");
                    }
                    CloseForm();
                    return;
                }

                // 1. Checar usando IPv4 direto 127.0.0.1 (evita delay IPv6 no Windows)
                UpdateStatus("Verificando se o Radar já está ativo...");
                bool initialWeb = IsUrlResponding("http://127.0.0.1:3000/login");
                bool initialApi = IsUrlResponding("http://127.0.0.1:3001/api/health") || IsUrlResponding("http://127.0.0.1:3001/api/docs");

                if (initialWeb && initialApi)
                {
                    UpdateStatus("Radar de Oportunidades ativo! Abrindo...");
                    Thread.Sleep(300);
                    OpenBrowser("http://localhost:3000/login");
                    Thread.Sleep(500);
                    CloseForm();
                    return;
                }

                // 2. Se qualquer um dos serviços não estiver 100% ativo, liberar portas para início limpo e sincronizado
                if (!initialWeb || !initialApi)
                {
                    UpdateStatus("Liberando portas de rede (3000 e 3001)...");
                    RunHiddenPowerShell("Get-NetTCPConnection -LocalPort 3000, 3001 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } catch {} }");
                    Thread.Sleep(300);
                    initialWeb = false;
                    initialApi = false;
                }

                string apiDir = Path.Combine(projectDir, "apps\\api");
                string webDir = Path.Combine(projectDir, "apps\\web");

                // 3. Iniciar Servidor API caso não esteja ativo
                if (!initialApi)
                {
                    UpdateStatus("Iniciando Servidor API e Robô WhatsApp...");
                    StartBackgroundService(apiDir, "node dist/main.js");
                    Thread.Sleep(200);
                }

                // 4. Iniciar Painel Web caso não esteja ativo
                if (!initialWeb)
                {
                    UpdateStatus("Iniciando Painel Web Turbo...");
                    StartBackgroundService(webDir, "npm run start");
                }

                // 5. Polling inteligente usando 127.0.0.1 (resposta instantânea em 1ms)
                UpdateStatus("Aguardando servidores locais...");
                bool isReady = false;
                for (int i = 0; i < 30; i++) // até ~15 segundos no máximo
                {
                    if (isClosing) return;
                    Thread.Sleep(500);

                    bool webOk = IsUrlResponding("http://127.0.0.1:3000/login");
                    bool apiOk = IsUrlResponding("http://127.0.0.1:3001/api/health") || IsUrlResponding("http://127.0.0.1:3001/api/docs");

                    if (webOk && apiOk)
                    {
                        isReady = true;
                        break;
                    }

                    if (webOk && !apiOk)
                    {
                        UpdateStatus("Painel pronto! Conectando API (" + (i / 2 + 1) + "s)...");
                        // Se o painel já está pronto e já passaram 10 segundos, abrir sem travar o usuário
                        if (i >= 18)
                        {
                            isReady = true;
                            break;
                        }
                    }
                    else if (!webOk && apiOk)
                    {
                        UpdateStatus("API pronta! Conectando Painel Web...");
                    }
                    else
                    {
                        UpdateStatus("Inicializando serviços locais...");
                    }
                }

                if (isClosing) return;
                UpdateStatus("Tudo pronto! Abrindo o Radar de Oportunidades...");
                Thread.Sleep(300);
                OpenBrowser("http://localhost:3000/login");
                Thread.Sleep(500);
                CloseForm();
            }
            catch (Exception ex)
            {
                if (isClosing) return;
                UpdateStatus("Abrindo no navegador...");
                Thread.Sleep(400);
                OpenBrowser("http://localhost:3000/login");
                CloseForm();
            }
        }

        private bool IsUrlResponding(string url)
        {
            try
            {
                HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                req.Timeout = 1000;
                req.ReadWriteTimeout = 1000;
                req.Proxy = null; // Remove proxy detection delay do Windows
                req.Method = "GET";
                using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private void StartBackgroundService(string workingDir, string npmArgs)
        {
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "cmd.exe";
            psi.Arguments = "/c " + npmArgs;
            psi.WorkingDirectory = workingDir;
            psi.CreateNoWindow = true;
            psi.UseShellExecute = false;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            Process.Start(psi);
        }

        private void RunHiddenPowerShell(string script)
        {
            try
            {
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "powershell.exe";
                psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -Command \"" + script + "\"";
                psi.CreateNoWindow = true;
                psi.UseShellExecute = false;
                psi.WindowStyle = ProcessWindowStyle.Hidden;
                Process p = Process.Start(psi);
                p.WaitForExit(3000);
            }
            catch { }
        }

        private void OpenBrowser(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch
            {
                Process.Start("cmd.exe", "/c start " + url);
            }
        }

        private void CloseForm()
        {
            if (InvokeRequired)
            {
                try { Invoke(new Action(CloseForm)); } catch { }
                return;
            }
            this.Close();
        }
    }
}
