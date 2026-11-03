using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Media.Effects;
using Microsoft.Win32;

namespace UlakInstaller
{
    public class Program
    {
        [STAThread]
        public static void Main(string[] args)
        {
            try
            {
                var app = new Application();
                bool isUninstall = false;
                string targetDir = null;

                // 1. Process filename check (uninstall.exe, unins000.exe, etc.)
                try
                {
                    string currentExeName = Path.GetFileName(Assembly.GetExecutingAssembly().Location).ToLowerInvariant();
                    if (currentExeName.Contains("uninstall") || currentExeName.Contains("unins"))
                    {
                        isUninstall = true;
                    }
                }
                catch { }

                // 2. Command-line args check (--uninstall, -uninstall, /uninstall, etc.)
                if (args != null)
                {
                    for (int i = 0; i < args.Length; i++)
                    {
                        string arg = args[i].ToLowerInvariant();
                        if (arg == "--uninstall" || arg == "-uninstall" || arg == "/uninstall" || arg == "/u" || arg == "-u" || arg == "--uninstall-worker")
                        {
                            isUninstall = true;
                        }
                        if ((arg == "--dir" || arg == "-dir" || arg == "--install-dir" || arg == "/dir") && i + 1 < args.Length)
                        {
                            targetDir = args[i + 1].Trim('"');
                        }
                    }
                }

                if (isUninstall)
                {
                    string currentExePath = Assembly.GetExecutingAssembly().Location;
                    string currentDir = Path.GetDirectoryName(currentExePath);

                    bool isWorker = false;
                    if (args != null)
                    {
                        foreach (var a in args)
                        {
                            if (a.ToLowerInvariant() == "--uninstall-worker") isWorker = true;
                        }
                    }

                    // If running directly from install directory, copy self to TEMP and run worker to prevent executable lock
                    if (!isWorker)
                    {
                        try
                        {
                            if (string.IsNullOrEmpty(targetDir))
                            {
                                targetDir = currentDir;
                            }

                            string tempFolder = Path.Combine(Path.GetTempPath(), "ULAK_Uninstaller");
                            Directory.CreateDirectory(tempFolder);
                            string tempExe = Path.Combine(tempFolder, "uninstall.exe");

                            File.Copy(currentExePath, tempExe, true);

                            var psi = new System.Diagnostics.ProcessStartInfo
                            {
                                FileName = tempExe,
                                Arguments = string.Format("--uninstall-worker --dir \"{0}\"", targetDir),
                                UseShellExecute = true
                            };
                            System.Diagnostics.Process.Start(psi);
                            return;
                        }
                        catch
                        {
                            // If temp copy fails, continue directly
                        }
                    }

                    var uninstallerWin = new UninstallerWindow(targetDir);
                    app.Run(uninstallerWin);
                }
                else
                {
                    var win = new InstallerWindow();
                    app.Run(win);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("İşlem başlatılamadı: " + ex.Message, "ULAK Hata", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }

    public class InstallerWindow : Window
    {
        private Grid mainGrid;
        private Border leftSidebar;
        private Grid contentArea;

        // Steps
        private Grid step1Welcome;
        private Grid step2Settings;
        private Grid step3Progress;
        private Grid step4Finished;

        // Step 1 controls
        private CheckBox chkLicense;
        private Button btnStep1Next;

        // Step 2 controls
        private TextBox txtInstallPath;
        private CheckBox chkDesktopShortcut;
        private CheckBox chkStartMenuShortcut;
        private CheckBox chkFirewallRules;
        private CheckBox chkAutoTray;
        private TextBlock lblDiskInfo;
        private ProgressBar diskUsageBar;

        // Step 3 controls
        private ProgressBar progressBar;
        private TextBlock lblProgressPercent;
        private TextBlock lblCurrentFile;
        private TextBlock lblStatusMessage;
        private TextBlock lblFileCounter;
        private TextBox txtInstallLog;

        // Step 4 controls
        private CheckBox chkLaunchAfter;
        private TextBlock lblInstalledPathInfo;

        // Step indicators in sidebar
        private Border[] stepIndicators = new Border[4];
        private TextBlock[] stepTexts = new TextBlock[4];

        private string defaultInstallPath;
        private BitmapImage logoImage;

        public InstallerWindow()
        {
            this.Title = "ULAK - Ağ ve Güvenlik İstasyonu Kurulumu";
            this.Width = 920;
            this.Height = 620;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            this.WindowStyle = WindowStyle.None;
            this.AllowsTransparency = true;
            this.Background = Brushes.Transparent;
            this.ResizeMode = ResizeMode.NoResize;

            defaultInstallPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs", "ULAK");

            LoadLogo();
            BuildUI();
            ShowStep(1);
        }

        private void LoadLogo()
        {
            try
            {
                var asm = Assembly.GetExecutingAssembly();
                using (var stream = asm.GetManifestResourceStream("ULAK.logo.png"))
                {
                    if (stream != null)
                    {
                        var bmp = new BitmapImage();
                        bmp.BeginInit();
                        bmp.StreamSource = stream;
                        bmp.CacheOption = BitmapCacheOption.OnLoad;
                        bmp.EndInit();
                        logoImage = bmp;
                    }
                }
            }
            catch { }
        }

        private void BuildUI()
        {
            // Outer Glowing Frame (Obsidian Liquid Glass with Emerald border)
            var outerBorder = new Border
            {
                CornerRadius = new CornerRadius(16),
                Background = new LinearGradientBrush(
                    Color.FromRgb(10, 14, 22),
                    Color.FromRgb(6, 9, 14),
                    new Point(0, 0),
                    new Point(1, 1)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(140, 16, 185, 129)),
                BorderThickness = new Thickness(1.4),
                Effect = new DropShadowEffect
                {
                    Color = Color.FromRgb(16, 185, 129),
                    BlurRadius = 38,
                    Opacity = 0.38,
                    ShadowDepth = 0
                }
            };

            mainGrid = new Grid();
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(46) }); // Header
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Body

            // 1. Header Bar (Draggable)
            var headerBar = BuildHeaderBar();
            Grid.SetRow(headerBar, 0);
            mainGrid.Children.Add(headerBar);

            // 2. Main Body Grid (Sidebar + Content)
            var bodyGrid = new Grid();
            bodyGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(270) });
            bodyGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            leftSidebar = BuildSidebar();
            Grid.SetColumn(leftSidebar, 0);
            bodyGrid.Children.Add(leftSidebar);

            contentArea = new Grid { Margin = new Thickness(22, 16, 22, 18) };
            Grid.SetColumn(contentArea, 1);
            bodyGrid.Children.Add(contentArea);

            // Build Steps
            step1Welcome = BuildStep1Welcome();
            step2Settings = BuildStep2Settings();
            step3Progress = BuildStep3Progress();
            step4Finished = BuildStep4Finished();

            contentArea.Children.Add(step1Welcome);
            contentArea.Children.Add(step2Settings);
            contentArea.Children.Add(step3Progress);
            contentArea.Children.Add(step4Finished);

            Grid.SetRow(bodyGrid, 1);
            mainGrid.Children.Add(bodyGrid);

            outerBorder.Child = mainGrid;
            this.Content = outerBorder;
        }

        private Grid BuildHeaderBar()
        {
            var header = new Grid
            {
                Background = new SolidColorBrush(Color.FromRgb(12, 17, 27))
            };
            header.MouseLeftButtonDown += (s, e) => { this.DragMove(); };

            // Left App Logo & Title
            var titlePanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(16, 0, 0, 0)
            };

            if (logoImage != null)
            {
                var iconImg = new Image
                {
                    Source = logoImage,
                    Width = 24,
                    Height = 24,
                    Margin = new Thickness(0, 0, 10, 0)
                };
                titlePanel.Children.Add(iconImg);
            }

            var appTitle = new TextBlock
            {
                Text = "ULAK",
                FontWeight = FontWeights.Bold,
                FontSize = 14,
                Foreground = Brushes.White,
                VerticalAlignment = VerticalAlignment.Center
            };
            titlePanel.Children.Add(appTitle);

            var badge = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(40, 16, 185, 129)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(90, 16, 185, 129)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(4),
                Margin = new Thickness(10, 0, 0, 0),
                Padding = new Thickness(7, 2, 7, 2),
                VerticalAlignment = VerticalAlignment.Center,
                Child = new TextBlock
                {
                    Text = "AĞ VE GÜVENLİK İSTASYONU",
                    FontSize = 9.5,
                    FontWeight = FontWeights.Bold,
                    Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153))
                }
            };
            titlePanel.Children.Add(badge);

            var verBadge = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(20, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(4),
                Margin = new Thickness(8, 0, 0, 0),
                Padding = new Thickness(6, 2, 6, 2),
                VerticalAlignment = VerticalAlignment.Center,
                Child = new TextBlock
                {
                    Text = "KURULUM v2.5.0",
                    FontSize = 9.5,
                    Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225))
                }
            };
            titlePanel.Children.Add(verBadge);
            header.Children.Add(titlePanel);

            // Controls
            var controlPanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 10, 0)
            };

            var btnMin = new Button
            {
                Content = "—",
                Width = 34,
                Height = 30,
                Background = Brushes.Transparent,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                BorderThickness = new Thickness(0),
                FontSize = 13,
                Cursor = Cursors.Hand
            };
            btnMin.Click += (s, e) => { this.WindowState = WindowState.Minimized; };

            var btnClose = new Button
            {
                Content = "✕",
                Width = 34,
                Height = 30,
                Background = Brushes.Transparent,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                BorderThickness = new Thickness(0),
                FontSize = 12,
                Cursor = Cursors.Hand
            };
            btnClose.MouseEnter += (s, e) => {
                btnClose.Background = new SolidColorBrush(Color.FromRgb(220, 38, 38));
                btnClose.Foreground = Brushes.White;
            };
            btnClose.MouseLeave += (s, e) => {
                btnClose.Background = Brushes.Transparent;
                btnClose.Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184));
            };
            btnClose.Click += (s, e) => {
                if (MessageBox.Show("Kurulumdan çıkmak istediğinize emin misiniz?", "Kurulumu İptal Et", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
                {
                    this.Close();
                }
            };

            controlPanel.Children.Add(btnMin);
            controlPanel.Children.Add(btnClose);
            header.Children.Add(controlPanel);

            return header;
        }

        private Border BuildSidebar()
        {
            var border = new Border
            {
                Background = new LinearGradientBrush(
                    Color.FromRgb(11, 16, 26),
                    Color.FromRgb(7, 10, 16),
                    new Point(0, 0),
                    new Point(0, 1)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(45, 255, 255, 255)),
                BorderThickness = new Thickness(0, 0, 1.2, 0),
                Padding = new Thickness(18, 20, 18, 18)
            };

            var mainStack = new Grid();
            mainStack.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Brand
            mainStack.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Steps
            mainStack.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Feature info card
            mainStack.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Footer specs

            // Brand Header
            var brandStack = new StackPanel { Margin = new Thickness(0, 0, 0, 18) };
            if (logoImage != null)
            {
                var bigLogo = new Image
                {
                    Source = logoImage,
                    Width = 64,
                    Height = 64,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    Margin = new Thickness(0, 0, 0, 8),
                    Effect = new DropShadowEffect
                    {
                        Color = Color.FromRgb(16, 185, 129),
                        BlurRadius = 24,
                        Opacity = 0.6,
                        ShadowDepth = 0
                    }
                };
                brandStack.Children.Add(bigLogo);
            }

            var lblLogoText = new TextBlock
            {
                Text = "ULAK",
                FontSize = 20,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White,
                HorizontalAlignment = HorizontalAlignment.Center
            };
            brandStack.Children.Add(lblLogoText);

            var lblLogoSub = new TextBlock
            {
                Text = "Ağ ve Güvenlik İstasyonu",
                FontSize = 11,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 2, 0, 8)
            };
            brandStack.Children.Add(lblLogoSub);

            // Live status badge
            var liveBadge = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(30, 16, 185, 129)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(70, 16, 185, 129)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(10, 4, 10, 4),
                HorizontalAlignment = HorizontalAlignment.Center,
                Child = new StackPanel
                {
                    Orientation = Orientation.Horizontal,
                    Children = {
                        new Border {
                            Width = 7, Height = 7, CornerRadius = new CornerRadius(4),
                            Background = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
                            Margin = new Thickness(0, 0, 6, 0),
                            VerticalAlignment = VerticalAlignment.Center
                        },
                        new TextBlock {
                            Text = "Sistem Kuruluma Hazır",
                            FontSize = 10,
                            FontWeight = FontWeights.SemiBold,
                            Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
                            VerticalAlignment = VerticalAlignment.Center
                        }
                    }
                }
            };
            brandStack.Children.Add(liveBadge);

            Grid.SetRow(brandStack, 0);
            mainStack.Children.Add(brandStack);

            // Step indicators
            var stepStack = new StackPanel { Margin = new Thickness(0, 0, 0, 16) };
            string[] stepNames = { "1. Hoş Geldiniz & Lisans", "2. Kurulum Ayarları", "3. Dosyalar Yükleniyor", "4. Kurulum Tamamlandı" };
            for (int i = 0; i < 4; i++)
            {
                var indBorder = new Border
                {
                    CornerRadius = new CornerRadius(8),
                    Background = Brushes.Transparent,
                    Padding = new Thickness(12, 7, 12, 7),
                    Margin = new Thickness(0, 0, 0, 4)
                };

                var txt = new TextBlock
                {
                    Text = stepNames[i],
                    FontSize = 11.5,
                    Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139)),
                    FontWeight = FontWeights.SemiBold
                };

                indBorder.Child = txt;
                stepIndicators[i] = indBorder;
                stepTexts[i] = txt;
                stepStack.Children.Add(indBorder);
            }
            Grid.SetRow(stepStack, 1);
            mainStack.Children.Add(stepStack);

            // Middle Bento Card (Sabit Çekirdek Özellikler - Fills empty area)
            var featuresCard = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(12),
                Margin = new Thickness(0, 4, 0, 14),
                VerticalAlignment = VerticalAlignment.Stretch
            };

            var fStack = new StackPanel();
            fStack.Children.Add(new TextBlock
            {
                Text = "SABİT ÇEKİRDEK ARAÇLAR",
                FontSize = 9.5,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 0, 0, 8)
            });

            string[] features = {
                "🛡️ ULAK Güvenlik Duvarı",
                "📶 Wi-Fi & Hotspot Yöneticisi",
                "⚡ Bluetooth & Radyo Denetimi",
                "📊 Donanım & Çekirdek İzleme",
                "🛒 GitHub Modül Mağazası"
            };

            foreach (var feat in features)
            {
                var fTxt = new TextBlock
                {
                    Text = feat,
                    FontSize = 10.5,
                    Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                    Margin = new Thickness(0, 0, 0, 6)
                };
                fStack.Children.Add(fTxt);
            }
            featuresCard.Child = fStack;
            Grid.SetRow(featuresCard, 2);
            mainStack.Children.Add(featuresCard);

            // Bottom Specs Card
            var bottomCard = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(30, 0, 0, 0)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Padding = new Thickness(10, 8, 10, 8)
            };
            var bStack = new StackPanel();
            bStack.Children.Add(new TextBlock
            {
                Text = "Windows 10 / 11 (64-bit)",
                FontSize = 10,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                HorizontalAlignment = HorizontalAlignment.Center
            });
            bStack.Children.Add(new TextBlock
            {
                Text = "Hafifletilmiş Çekirdek • v2.5.0",
                FontSize = 9.5,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 2, 0, 0)
            });
            bottomCard.Child = bStack;
            Grid.SetRow(bottomCard, 3);
            mainStack.Children.Add(bottomCard);

            border.Child = mainStack;
            return border;
        }

        private void UpdateStepIndicators(int currentStep)
        {
            for (int i = 0; i < 4; i++)
            {
                int stepNum = i + 1;
                if (stepNum == currentStep)
                {
                    stepIndicators[i].Background = new SolidColorBrush(Color.FromArgb(40, 16, 185, 129));
                    stepIndicators[i].BorderBrush = new SolidColorBrush(Color.FromArgb(100, 16, 185, 129));
                    stepIndicators[i].BorderThickness = new Thickness(1);
                    stepTexts[i].Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153));
                }
                else if (stepNum < currentStep)
                {
                    stepIndicators[i].Background = Brushes.Transparent;
                    stepIndicators[i].BorderThickness = new Thickness(0);
                    stepTexts[i].Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184));
                }
                else
                {
                    stepIndicators[i].Background = Brushes.Transparent;
                    stepIndicators[i].BorderThickness = new Thickness(0);
                    stepTexts[i].Foreground = new SolidColorBrush(Color.FromRgb(71, 85, 105));
                }
            }
        }

        private void ShowStep(int step)
        {
            step1Welcome.Visibility = (step == 1) ? Visibility.Visible : Visibility.Collapsed;
            step2Settings.Visibility = (step == 2) ? Visibility.Visible : Visibility.Collapsed;
            step3Progress.Visibility = (step == 3) ? Visibility.Visible : Visibility.Collapsed;
            step4Finished.Visibility = (step == 4) ? Visibility.Visible : Visibility.Collapsed;

            UpdateStepIndicators(step);
        }

        // ==========================================
        // STEP 1: HOŞ GELDİNİZ & BENTO LİSANS SÖZLEŞMESİ
        // ==========================================
        private Grid BuildStep1Welcome()
        {
            var grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Hero Banner
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Bento Content
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Checkbox
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Actions

            // 1. Hero Banner
            var hero = new Border
            {
                Background = new LinearGradientBrush(
                    Color.FromRgb(16, 23, 38),
                    Color.FromRgb(11, 16, 28),
                    new Point(0, 0), new Point(1, 1)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(60, 16, 185, 129)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(18, 14, 18, 14),
                Margin = new Thickness(0, 0, 0, 12)
            };

            var heroStack = new StackPanel();
            var heroTitleRow = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 4) };
            heroTitleRow.Children.Add(new TextBlock
            {
                Text = "ULAK Ağ ve Donanım İstasyonu'na Hoş Geldiniz",
                FontSize = 17,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White
            });
            heroStack.Children.Add(heroTitleRow);

            heroStack.Children.Add(new TextBlock
            {
                Text = "Termius tarzı modern Bento Grid arayüzü ile donanımınızı, ağınızı ve güvenlik ayarlarınızı tek merkezden yönetin.",
                FontSize = 11.5,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 0, 0, 8)
            });

            // 3 Mini Pills
            var pillRow = new StackPanel { Orientation = Orientation.Horizontal };
            pillRow.Children.Add(CreateBadge("🛡️ Sıfır Güven Duvarı"));
            pillRow.Children.Add(CreateBadge("📶 Merkezi Wi-Fi & BT"));
            pillRow.Children.Add(CreateBadge("📦 GitHub Eklenti Ekosistemi"));
            heroStack.Children.Add(pillRow);

            hero.Child = heroStack;
            Grid.SetRow(hero, 0);
            grid.Children.Add(hero);

            // 2. Bento Content (2 Columns: Highlights + License)
            var bentoGrid = new Grid { Margin = new Thickness(0, 0, 0, 12) };
            bentoGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(200) });
            bentoGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            // Left Highlight Box
            var hlBox = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(13, 18, 30)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(30, 41, 59)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(14),
                Margin = new Thickness(0, 0, 10, 0)
            };

            var hlStack = new StackPanel();
            hlStack.Children.Add(new TextBlock
            {
                Text = "NEDEN ULAK?",
                FontSize = 10,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
                Margin = new Thickness(0, 0, 0, 10)
            });

            string[] hlItems = {
                "• Canlı Donanım Telemetrisi (CPU, RAM, Pil)",
                "• 4 Seviyeli Güvenlik Duvarı ve Port Denetimi",
                "• Anında Wi-Fi Hotspot & Sinyal Analizi",
                "• Bluetooth Cihaz Profilleri & Ses Denetimi",
                "• İsteğe Bağlı GitHub Eklentileri (Video vb.)",
                "• Canlı Sürüm Güncelleme & Rollback"
            };

            foreach (var it in hlItems)
            {
                hlStack.Children.Add(new TextBlock
                {
                    Text = it,
                    FontSize = 10,
                    Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                    LineHeight = 15,
                    Margin = new Thickness(0, 0, 0, 6),
                    TextWrapping = TextWrapping.Wrap
                });
            }
            hlBox.Child = hlStack;
            Grid.SetColumn(hlBox, 0);
            bentoGrid.Children.Add(hlBox);

            // Right License Box
            var licenseBorder = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(10, 14, 24)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(30, 41, 59)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(14)
            };

            var licenseScroll = new ScrollViewer { VerticalScrollBarVisibility = ScrollBarVisibility.Auto };
            var licenseText = new TextBlock
            {
                Text = @"ULAK - Ağ ve Güvenlik İstasyonu (Network & Security Station)
Son Kullanıcı Lisans Sözleşmesi (MIT Lisansı)

Telif Hakkı (c) 2026 ULAK Projesi Geliştiricileri

İşbu yazılımı ve ilişkili belge dosyalarını (""Yazılım"") edinen herkese, Yazılım'ı herhangi bir sınırlama olmaksızın kullanma, kopyalama, değiştirme, birleştirme, yayınlama, dağıtma, alt lisanslama ve/veya kopyalarını satma hakkı da dahil olmak üzere hiçbir ücret talep edilmeksizin izin verilir.

Önemli Şartlar ve Sistem Bildirimleri:
1. ÇEKİRDEK İSTASYON: Wi-Fi, Bluetooth, Güvenlik Duvarı, Donanım Takip ve Sistem Yönetimi doğrudan Windows sistem API'leri üzerinden çalışır ve sabit çekirdektir.
2. MODÜLER YAPI: Video indirici vb. ikincil ek araçlar ilk kuruluma dahil edilmemiştir; ihtiyaç duyulduğunda Mağaza üzerinden doğrudan GitHub'dan güvenle indirilebilir.
3. SÜRÜM YÖNETİMİ: İstasyon modülleri için dilediğiniz an en yeni sürüme geçebilir veya önceki kararlı sürüme geri çekme (Rollback) yapabilirsiniz.
4. YETKİLENDİRME: Güvenlik duvarı kuralları ve ağ adaptör yönetimi için Windows Yönetici (Administrator) ayrıcalıkları gerekebilir.

Yazılım ""olduğu gibi"" sunulmakta olup geliştiriciler doğrudan veya dolaylı veri kaybından sorumlu tutulamaz.",
                FontSize = 10.5,
                Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                TextWrapping = TextWrapping.Wrap,
                LineHeight = 16
            };
            licenseScroll.Content = licenseText;
            licenseBorder.Child = licenseScroll;
            Grid.SetColumn(licenseBorder, 1);
            bentoGrid.Children.Add(licenseBorder);

            Grid.SetRow(bentoGrid, 1);
            grid.Children.Add(bentoGrid);

            // 3. Checkbox in glass container
            var chkBoxBorder = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(30, 16, 185, 129)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(70, 16, 185, 129)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Padding = new Thickness(12, 8, 12, 8),
                Margin = new Thickness(0, 0, 0, 14)
            };

            chkLicense = new CheckBox
            {
                Content = "Lisans sözleşmesini, açık kaynak şartlarını ve gizlilik ilkelerini okudum, kabul ediyorum.",
                IsChecked = true,
                Foreground = new SolidColorBrush(Color.FromRgb(241, 245, 249)),
                FontSize = 11,
                FontWeight = FontWeights.Medium,
                Cursor = Cursors.Hand
            };
            chkLicense.Checked += (s, e) => { if (btnStep1Next != null) btnStep1Next.IsEnabled = true; };
            chkLicense.Unchecked += (s, e) => { if (btnStep1Next != null) btnStep1Next.IsEnabled = false; };
            chkBoxBorder.Child = chkLicense;
            Grid.SetRow(chkBoxBorder, 2);
            grid.Children.Add(chkBoxBorder);

            // 4. Action Buttons
            var actionGrid = new Grid();
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var btnCancel = CreateSecondaryButton("Vazgeç");
            btnCancel.Click += (s, e) => { this.Close(); };
            Grid.SetColumn(btnCancel, 0);
            actionGrid.Children.Add(btnCancel);

            var infoText = new TextBlock
            {
                Text = "Açık Kaynak Kodlu • Güvenli • Reklamsız",
                FontSize = 11,
                Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139)),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };
            Grid.SetColumn(infoText, 1);
            actionGrid.Children.Add(infoText);

            btnStep1Next = CreatePrimaryButton("İleri  →");
            btnStep1Next.Click += (s, e) => { ShowStep(2); };
            Grid.SetColumn(btnStep1Next, 2);
            actionGrid.Children.Add(btnStep1Next);

            Grid.SetRow(actionGrid, 3);
            grid.Children.Add(actionGrid);

            return grid;
        }

        // ==========================================
        // STEP 2: KURULUM AYARLARI (DOLU BENTO CONTROL ROOM)
        // ==========================================
        private Grid BuildStep2Settings()
        {
            var grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Header
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Cards Grid
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Actions

            // Header
            var headerStack = new StackPanel { Margin = new Thickness(0, 0, 0, 12) };
            headerStack.Children.Add(new TextBlock
            {
                Text = "Kurulum Tercihleri ve Sistem Entegrasyonu",
                FontSize = 18,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White
            });
            headerStack.Children.Add(new TextBlock
            {
                Text = "Uygulamanın yükleneceği dizini belirleyin ve Windows sistem entegrasyonlarını yapılandırın.",
                FontSize = 11.5,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 2, 0, 0)
            });
            Grid.SetRow(headerStack, 0);
            grid.Children.Add(headerStack);

            // Cards Grid (Vertical Stack filling the space)
            var stackCards = new StackPanel();

            // Card 1: Hedef Dizin & Canlı Disk Göstergesi
            var card1 = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(13, 18, 30)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(30, 41, 59)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(16),
                Margin = new Thickness(0, 0, 0, 12)
            };

            var card1Stack = new StackPanel();
            card1Stack.Children.Add(new TextBlock
            {
                Text = "Hedef Kurulum Klasörü",
                FontSize = 13,
                FontWeight = FontWeights.SemiBold,
                Foreground = Brushes.White,
                Margin = new Thickness(0, 0, 0, 8)
            });

            var pathRow = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            pathRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            pathRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            txtInstallPath = new TextBox
            {
                Text = defaultInstallPath,
                Background = new SolidColorBrush(Color.FromRgb(9, 12, 19)),
                Foreground = new SolidColorBrush(Color.FromRgb(241, 245, 249)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(51, 65, 85)),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(10, 8, 10, 8),
                FontSize = 11.5,
                VerticalContentAlignment = VerticalAlignment.Center
            };
            Grid.SetColumn(txtInstallPath, 0);
            pathRow.Children.Add(txtInstallPath);

            var btnBrowse = CreateSecondaryButton("Gözat...");
            btnBrowse.Margin = new Thickness(10, 0, 0, 0);
            btnBrowse.Padding = new Thickness(16, 7, 16, 7);
            btnBrowse.Click += (s, e) => {
                var dlg = new System.Windows.Forms.FolderBrowserDialog();
                dlg.Description = "ULAK için kurulum klasörünü seçin:";
                dlg.SelectedPath = txtInstallPath.Text;
                if (dlg.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                {
                    txtInstallPath.Text = dlg.SelectedPath;
                    UpdateDiskSpaceInfo();
                }
            };
            Grid.SetColumn(btnBrowse, 1);
            pathRow.Children.Add(btnBrowse);
            card1Stack.Children.Add(pathRow);

            // Disk Progress Bar and text
            diskUsageBar = new ProgressBar
            {
                Height = 6,
                Minimum = 0,
                Maximum = 100,
                Value = 15,
                Background = new SolidColorBrush(Color.FromRgb(20, 27, 43)),
                Foreground = new SolidColorBrush(Color.FromRgb(16, 185, 129)),
                BorderThickness = new Thickness(0),
                Margin = new Thickness(0, 0, 0, 6)
            };
            card1Stack.Children.Add(diskUsageBar);

            lblDiskInfo = new TextBlock
            {
                Text = "Gerekli Disk Alanı: ~255 MB  |  Kullanılabilir Boş Alan: Hesaplanıyor...",
                FontSize = 11,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184))
            };
            card1Stack.Children.Add(lblDiskInfo);
            card1.Child = card1Stack;
            stackCards.Children.Add(card1);

            // Card 2: Entegrasyon Tercihleri (2x2 Grid)
            var card2 = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(13, 18, 30)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(30, 41, 59)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(16),
                Margin = new Thickness(0, 0, 0, 12)
            };

            var card2Stack = new StackPanel();
            card2Stack.Children.Add(new TextBlock
            {
                Text = "Sistem ve Kısayol Entegrasyonu",
                FontSize = 13,
                FontWeight = FontWeights.SemiBold,
                Foreground = Brushes.White,
                Margin = new Thickness(0, 0, 0, 10)
            });

            var checkGrid = new Grid();
            checkGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            checkGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            checkGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            checkGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

            chkDesktopShortcut = new CheckBox
            {
                Content = "Masaüstü kısayolu oluştur (ULAK)",
                IsChecked = true,
                Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                FontSize = 11,
                Margin = new Thickness(0, 0, 0, 8),
                Cursor = Cursors.Hand
            };
            Grid.SetRow(chkDesktopShortcut, 0);
            Grid.SetColumn(chkDesktopShortcut, 0);
            checkGrid.Children.Add(chkDesktopShortcut);

            chkStartMenuShortcut = new CheckBox
            {
                Content = "Başlat menüsüne ULAK ekle",
                IsChecked = true,
                Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                FontSize = 11,
                Margin = new Thickness(0, 0, 0, 8),
                Cursor = Cursors.Hand
            };
            Grid.SetRow(chkStartMenuShortcut, 0);
            Grid.SetColumn(chkStartMenuShortcut, 1);
            checkGrid.Children.Add(chkStartMenuShortcut);

            chkFirewallRules = new CheckBox
            {
                Content = "Güvenlik Duvarı kurallarını optimize et",
                IsChecked = true,
                Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                FontSize = 11,
                Cursor = Cursors.Hand
            };
            Grid.SetRow(chkFirewallRules, 1);
            Grid.SetColumn(chkFirewallRules, 0);
            checkGrid.Children.Add(chkFirewallRules);

            chkAutoTray = new CheckBox
            {
                Content = "Bildirim alanında (Tray) hazır beklet",
                IsChecked = true,
                Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                FontSize = 11,
                Cursor = Cursors.Hand
            };
            Grid.SetRow(chkAutoTray, 1);
            Grid.SetColumn(chkAutoTray, 1);
            checkGrid.Children.Add(chkAutoTray);

            card2Stack.Children.Add(checkGrid);
            card2.Child = card2Stack;
            stackCards.Children.Add(card2);

            // Card 3: Ön Kontrol Listesi (Checklist)
            var card3 = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(20, 16, 185, 129)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(60, 16, 185, 129)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(14)
            };

            var card3Stack = new StackPanel();
            card3Stack.Children.Add(new TextBlock
            {
                Text = "ÖN KURULUM KONTROLÜ",
                FontSize = 10,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
                Margin = new Thickness(0, 0, 0, 6)
            });

            var checkListRow = new StackPanel { Orientation = Orientation.Horizontal };
            checkListRow.Children.Add(CreateCheckItem("✓ 64-bit Windows Desteği"));
            checkListRow.Children.Add(CreateCheckItem("✓ WLAN & Bluetooth API Hazır"));
            checkListRow.Children.Add(CreateCheckItem("✓ Disk Alanı Yeterli"));
            card3Stack.Children.Add(checkListRow);

            card3.Child = card3Stack;
            stackCards.Children.Add(card3);

            Grid.SetRow(stackCards, 1);
            grid.Children.Add(stackCards);

            // Actions
            var actionGrid = new Grid { Margin = new Thickness(0, 14, 0, 0) };
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var btnBack = CreateSecondaryButton("←  Geri");
            btnBack.Click += (s, e) => { ShowStep(1); };
            Grid.SetColumn(btnBack, 0);
            actionGrid.Children.Add(btnBack);

            var btnStartInstall = CreatePrimaryButton("🚀  Kurulumu Başlat");
            btnStartInstall.Padding = new Thickness(26, 9, 26, 9);
            btnStartInstall.Click += (s, e) => {
                ShowStep(3);
                StartInstallation();
            };
            Grid.SetColumn(btnStartInstall, 2);
            actionGrid.Children.Add(btnStartInstall);

            Grid.SetRow(actionGrid, 2);
            grid.Children.Add(actionGrid);

            UpdateDiskSpaceInfo();
            return grid;
        }

        private void UpdateDiskSpaceInfo()
        {
            try
            {
                string root = Path.GetPathRoot(txtInstallPath.Text);
                if (!string.IsNullOrEmpty(root))
                {
                    var drive = new DriveInfo(root);
                    double freeGb = drive.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0);
                    double totalGb = drive.TotalSize / (1024.0 * 1024.0 * 1024.0);
                    lblDiskInfo.Text = string.Format("Gerekli Alan: ~255 MB  |  Boş Alan ({0}): {1:0.0} GB / {2:0.0} GB (NTFS)", root.TrimEnd('\\'), freeGb, totalGb);
                    if (diskUsageBar != null)
                    {
                        diskUsageBar.Value = Math.Max(5, Math.Min(95, (int)((1.0 - (freeGb / totalGb)) * 100)));
                    }
                }
            }
            catch { }
        }

        // ==========================================
        // STEP 3: KURULUM İLERLEMESİ (DOLU CYBER MISSION DECK)
        // ==========================================
        private Grid BuildStep3Progress()
        {
            var grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Header
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Deck
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Tip banner

            // Header
            var headerStack = new StackPanel { Margin = new Thickness(0, 0, 0, 14) };
            headerStack.Children.Add(new TextBlock
            {
                Text = "ULAK İstasyonu Sisteme Yerleştiriliyor...",
                FontSize = 18,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White
            });
            headerStack.Children.Add(new TextBlock
            {
                Text = "Bileşenler ayıklanıyor, sistem kayıtları ve kısayollar yapılandırılıyor.",
                FontSize = 11.5,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 2, 0, 0)
            });
            Grid.SetRow(headerStack, 0);
            grid.Children.Add(headerStack);

            // Deck Grid (Progress Card + Terminal Console)
            var deck = new Grid();
            deck.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Progress Box
            deck.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Terminal Log Box

            // 1. Progress Box
            var progressCard = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(13, 18, 30)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(80, 16, 185, 129)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(18),
                Margin = new Thickness(0, 0, 0, 12)
            };

            var pStack = new StackPanel();

            // Status message & Percent Row
            var topPRow = new Grid { Margin = new Thickness(0, 0, 0, 10) };
            topPRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            topPRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            lblStatusMessage = new TextBlock
            {
                Text = "Kurulum başlatılıyor...",
                FontSize = 13,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153))
            };
            Grid.SetColumn(lblStatusMessage, 0);
            topPRow.Children.Add(lblStatusMessage);

            lblProgressPercent = new TextBlock
            {
                Text = "%0",
                FontSize = 18,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White
            };
            Grid.SetColumn(lblProgressPercent, 1);
            topPRow.Children.Add(lblProgressPercent);
            pStack.Children.Add(topPRow);

            // Neon Progress bar
            progressBar = new ProgressBar
            {
                Height = 12,
                Minimum = 0,
                Maximum = 100,
                Value = 0,
                Background = new SolidColorBrush(Color.FromRgb(9, 12, 19)),
                Foreground = new LinearGradientBrush(
                    Color.FromRgb(16, 185, 129),
                    Color.FromRgb(6, 182, 212),
                    new Point(0, 0),
                    new Point(1, 0)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(100, 16, 185, 129)),
                BorderThickness = new Thickness(1),
                Margin = new Thickness(0, 0, 0, 8)
            };
            pStack.Children.Add(progressBar);

            // File Ticker & Counter Row
            var bottomPRow = new Grid();
            bottomPRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            bottomPRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            lblCurrentFile = new TextBlock
            {
                Text = "Arşiv taranıyor...",
                FontSize = 11,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                TextTrimming = TextTrimming.CharacterEllipsis
            };
            Grid.SetColumn(lblCurrentFile, 0);
            bottomPRow.Children.Add(lblCurrentFile);

            lblFileCounter = new TextBlock
            {
                Text = "Dosya: 0 / 72",
                FontSize = 11,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184))
            };
            Grid.SetColumn(lblFileCounter, 1);
            bottomPRow.Children.Add(lblFileCounter);
            pStack.Children.Add(bottomPRow);

            progressCard.Child = pStack;
            Grid.SetRow(progressCard, 0);
            deck.Children.Add(progressCard);

            // 2. Live Terminal Console (Fills the center empty space)
            var logCard = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(6, 9, 14)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(26, 36, 52)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(12),
                Margin = new Thickness(0, 0, 0, 12)
            };

            var logGrid = new Grid();
            logGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            logGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            var logTitle = new TextBlock
            {
                Text = "CANLI YÜKLEME GÜNLÜĞÜ (TERMINAL CONSOLE)",
                FontSize = 9.5,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139)),
                Margin = new Thickness(0, 0, 0, 6)
            };
            Grid.SetRow(logTitle, 0);
            logGrid.Children.Add(logTitle);

            txtInstallLog = new TextBox
            {
                Background = Brushes.Transparent,
                Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
                BorderThickness = new Thickness(0),
                FontFamily = new FontFamily("Consolas, Courier New, monospace"),
                FontSize = 10,
                IsReadOnly = true,
                TextWrapping = TextWrapping.Wrap,
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                Text = "[BAŞLATILDI] ULAK v2.5.0 Kurulum motoru hazırlandı...\n[BİLGİ] Hedef dizin taranıyor..."
            };
            Grid.SetRow(txtInstallLog, 1);
            logGrid.Children.Add(txtInstallLog);

            logCard.Child = logGrid;
            Grid.SetRow(logCard, 1);
            deck.Children.Add(logCard);

            Grid.SetRow(deck, 1);
            grid.Children.Add(deck);

            // Bottom Tip Banner
            var tipBorder = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(20, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Padding = new Thickness(12, 7, 12, 7)
            };
            tipBorder.Child = new TextBlock
            {
                Text = "💡 Bilgi: İlk kurulum paketini hafif tutmak için Video İndirici vb. ek araçlar Mağaza üzerinden GitHub ile tek tıkla indirilecek şekilde ayrılmıştır.",
                FontSize = 10.5,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184))
            };
            Grid.SetRow(tipBorder, 2);
            grid.Children.Add(tipBorder);

            return grid;
        }

        // ==========================================
        // STEP 4: KURULUM TAMAMLANDI (DOLU DASHBOARD)
        // ==========================================
        private Grid BuildStep4Finished()
        {
            var grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Hero Celebration
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Bento Info Grid
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Launch checkbox
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Actions

            // 1. Hero Celebration Banner
            var hero = new Border
            {
                Background = new LinearGradientBrush(
                    Color.FromRgb(13, 24, 38),
                    Color.FromRgb(9, 15, 24),
                    new Point(0, 0), new Point(1, 1)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(100, 16, 185, 129)),
                BorderThickness = new Thickness(1.2),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(18, 14, 18, 14),
                Margin = new Thickness(0, 0, 0, 12)
            };

            var heroStack = new StackPanel { Orientation = Orientation.Horizontal };

            var checkBorder = new Border
            {
                Width = 44,
                Height = 44,
                CornerRadius = new CornerRadius(22),
                Background = new SolidColorBrush(Color.FromArgb(50, 16, 185, 129)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(16, 185, 129)),
                BorderThickness = new Thickness(2),
                Margin = new Thickness(0, 0, 14, 0),
                Child = new TextBlock
                {
                    Text = "✓",
                    FontSize = 22,
                    FontWeight = FontWeights.Bold,
                    Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
                    HorizontalAlignment = HorizontalAlignment.Center,
                    VerticalAlignment = VerticalAlignment.Center
                }
            };
            heroStack.Children.Add(checkBorder);

            var heroTextStack = new StackPanel();
            heroTextStack.Children.Add(new TextBlock
            {
                Text = "Kurulum Başarıyla Tamamlandı! 🎉",
                FontSize = 18,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White
            });
            heroTextStack.Children.Add(new TextBlock
            {
                Text = "ULAK Ağ ve Donanım İstasyonu kullanıma hazır. Tüm çekirdek servisler doğrulandı.",
                FontSize = 11.5,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 2, 0, 0)
            });
            heroStack.Children.Add(heroTextStack);
            hero.Child = heroStack;

            Grid.SetRow(hero, 0);
            grid.Children.Add(hero);

            // 2. Bento Info Grid (2 Columns: Specs Summary + Quick Guide)
            var bento = new Grid { Margin = new Thickness(0, 0, 0, 12) };
            bento.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            bento.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            // Card 1: Kurulum Özeti
            var summaryCard = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(13, 18, 30)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(30, 41, 59)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(14),
                Margin = new Thickness(0, 0, 6, 0)
            };

            var sStack = new StackPanel();
            sStack.Children.Add(new TextBlock
            {
                Text = "KURULUM ÖZETİ",
                FontSize = 10,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
                Margin = new Thickness(0, 0, 0, 10)
            });

            sStack.Children.Add(CreateSummaryRow("Sürüm:", "v2.5.0 (Windows 64-bit)"));
            sStack.Children.Add(CreateSummaryRow("Paket Modeli:", "Hafifletilmiş Çekirdek"));
            sStack.Children.Add(CreateSummaryRow("Sabit Modüller:", "Wi-Fi, Bluetooth, Firewall, Donanım"));
            sStack.Children.Add(CreateSummaryRow("Eklenti Mağazası:", "GitHub Entegrasyonu Aktif"));

            lblInstalledPathInfo = new TextBlock
            {
                Text = "Dizin: " + defaultInstallPath,
                FontSize = 10,
                Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139)),
                TextTrimming = TextTrimming.CharacterEllipsis,
                Margin = new Thickness(0, 8, 0, 0)
            };
            sStack.Children.Add(lblInstalledPathInfo);

            summaryCard.Child = sStack;
            Grid.SetColumn(summaryCard, 0);
            bento.Children.Add(summaryCard);

            // Card 2: Hızlı Başlangıç Rehberi
            var guideCard = new Border
            {
                Background = new SolidColorBrush(Color.FromRgb(13, 18, 30)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(30, 41, 59)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(14),
                Margin = new Thickness(6, 0, 0, 0)
            };

            var gStack = new StackPanel();
            gStack.Children.Add(new TextBlock
            {
                Text = "HIZLI BAŞLANGIÇ İPUÇLARI",
                FontSize = 10,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(6, 182, 212)),
                Margin = new Thickness(0, 0, 0, 10)
            });

            string[] tips = {
                "1. 🛡️ Güvenlik Duvarı: 4 mod arasından koruma seviyenizi belirleyin.",
                "2. 📶 Ağ & BT: Cihazlarınızı ve Wi-Fi sinyallerinizi anlık haritada izleyin.",
                "3. 🛒 Mağaza: İhtiyaç duyduğunuzda Video İndirici vb. modülleri kurun.",
                "4. 🔄 Sürüm Denetimi: Modülleri istediğiniz zaman güncelleyin veya geri çekin."
            };

            foreach (var t in tips)
            {
                gStack.Children.Add(new TextBlock
                {
                    Text = t,
                    FontSize = 10,
                    Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                    LineHeight = 15,
                    Margin = new Thickness(0, 0, 0, 6),
                    TextWrapping = TextWrapping.Wrap
                });
            }

            guideCard.Child = gStack;
            Grid.SetColumn(guideCard, 1);
            bento.Children.Add(guideCard);

            Grid.SetRow(bento, 1);
            grid.Children.Add(bento);

            // 3. Launch Checkbox Box
            var launchBox = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(30, 16, 185, 129)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(80, 16, 185, 129)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Padding = new Thickness(14, 8, 14, 8),
                Margin = new Thickness(0, 0, 0, 14)
            };

            chkLaunchAfter = new CheckBox
            {
                Content = "ULAK Ağ ve Güvenlik İstasyonu'nu Şimdi Başlat",
                IsChecked = true,
                Foreground = new SolidColorBrush(Color.FromRgb(241, 245, 249)),
                FontSize = 12,
                FontWeight = FontWeights.SemiBold,
                Cursor = Cursors.Hand
            };
            launchBox.Child = chkLaunchAfter;
            Grid.SetRow(launchBox, 2);
            grid.Children.Add(launchBox);

            // 4. Action
            var actionGrid = new Grid();
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var btnFinish = CreatePrimaryButton("🚀  İstasyonu Başlat ve Bitir");
            btnFinish.Padding = new Thickness(36, 10, 36, 10);
            btnFinish.Click += (s, e) => {
                if (chkLaunchAfter.IsChecked == true)
                {
                    try
                    {
                        string exePath = Path.Combine(txtInstallPath.Text, "ULAK.exe");
                        if (File.Exists(exePath))
                        {
                            System.Diagnostics.Process.Start(exePath);
                        }
                    }
                    catch { }
                }
                this.Close();
            };
            Grid.SetColumn(btnFinish, 1);
            actionGrid.Children.Add(btnFinish);

            Grid.SetRow(actionGrid, 3);
            grid.Children.Add(actionGrid);

            return grid;
        }

        // ==========================================
        // WORKER INSTALLATION LOGIC
        // ==========================================
        private void StartInstallation()
        {
            string targetDir = txtInstallPath.Text;
            bool createDesktop = chkDesktopShortcut.IsChecked == true;
            bool createStartMenu = chkStartMenuShortcut.IsChecked == true;

            Task.Factory.StartNew(() =>
            {
                try
                {
                    AppendLog("[BAŞLATILDI] Kurulum işlemi başlatıldı.");
                    UpdateProgress(5, "Hedef kurulum dizini yapılandırılıyor...", "", 0, 72);

                    if (!Directory.Exists(targetDir))
                    {
                        Directory.CreateDirectory(targetDir);
                        AppendLog("[DİZİN] Oluşturuldu: " + targetDir);
                    }

                    // Extract payload
                    var asm = Assembly.GetExecutingAssembly();
                    using (var stream = asm.GetManifestResourceStream("ULAK.payload.zip"))
                    {
                        if (stream == null)
                        {
                            throw new Exception("Kurulum paketi (payload.zip) kaynakta bulunamadı!");
                        }

                        using (var archive = new ZipArchive(stream, ZipArchiveMode.Read))
                        {
                            int totalEntries = archive.Entries.Count;
                            int currentEntry = 0;

                            AppendLog(string.Format("[AYIKLAMA] Arşiv açıldı. Toplam {0} dosya aktarılıyor...", totalEntries));

                            foreach (var entry in archive.Entries)
                            {
                                currentEntry++;
                                int percent = 8 + (int)((currentEntry / (double)totalEntries) * 78);

                                string destPath = Path.Combine(targetDir, entry.FullName);
                                if (string.IsNullOrEmpty(entry.Name))
                                {
                                    Directory.CreateDirectory(destPath);
                                }
                                else
                                {
                                    string dir = Path.GetDirectoryName(destPath);
                                    if (!Directory.Exists(dir))
                                    {
                                        Directory.CreateDirectory(dir);
                                    }

                                    entry.ExtractToFile(destPath, true);
                                }

                                if (currentEntry % 2 == 0 || currentEntry == totalEntries)
                                {
                                    UpdateProgress(percent, "Dosyalar aktarılıyor...", entry.FullName, currentEntry, totalEntries);
                                    AppendLog("[DOSYA] " + entry.FullName);
                                    Thread.Sleep(8);
                                }
                            }
                        }
                    }

                    // Shortcuts
                    UpdateProgress(88, "Windows kısayolları oluşturuluyor...", "", 72, 72);
                    string exePath = Path.Combine(targetDir, "ULAK.exe");

                    if (createDesktop)
                    {
                        string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                        CreateShortcut(Path.Combine(desktopPath, "ULAK.lnk"), exePath, targetDir, "ULAK - Ağ ve Güvenlik İstasyonu");
                        AppendLog("[KISAYOL] Masaüstü kısayolu oluşturuldu.");
                    }

                    if (createStartMenu)
                    {
                        string startMenuPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");
                        CreateShortcut(Path.Combine(startMenuPath, "ULAK.lnk"), exePath, targetDir, "ULAK - Ağ ve Güvenlik İstasyonu");
                        AppendLog("[KISAYOL] Başlat menüsü kısayolu oluşturuldu.");
                    }

                    // Registry
                    UpdateProgress(94, "Windows sistem kayıtları (Uninstall) yapılıyor...", "", 72, 72);
                    RegisterInControlPanel(targetDir, exePath);
                    AppendLog("[REGISTRY] Program Ekle/Kaldır kaydı başarıyla oluşturuldu.");

                    // Uninstaller
                    CreateUninstaller(targetDir);
                    AppendLog("[KALDIRICI] ULAK Arayüzlü Kaldırıcı (uninstall.exe) hazırlandı.");

                    UpdateProgress(100, "Kurulum başarıyla tamamlandı!", "Tüm sistem hazır.", 72, 72);
                    AppendLog("[TAMAMLANDI] ULAK v2.5.0 kullanıma hazır.");
                    Thread.Sleep(500);

                    Dispatcher.Invoke((Action)(() =>
                    {
                        lblInstalledPathInfo.Text = "Dizin: " + targetDir;
                        ShowStep(4);
                    }));
                }
                catch (Exception ex)
                {
                    Dispatcher.Invoke((Action)(() =>
                    {
                        MessageBox.Show("Kurulum sırasında hata: " + ex.Message, "Hata", MessageBoxButton.OK, MessageBoxImage.Error);
                        ShowStep(2);
                    }));
                }
            });
        }

        private void AppendLog(string message)
        {
            Dispatcher.Invoke((Action)(() =>
            {
                if (txtInstallLog != null)
                {
                    string time = DateTime.Now.ToString("HH:mm:ss");
                    txtInstallLog.AppendText(string.Format("\n[{0}] {1}", time, message));
                    txtInstallLog.ScrollToEnd();
                }
            }));
        }

        private void UpdateProgress(int percent, string status, string file, int current, int total)
        {
            Dispatcher.Invoke((Action)(() =>
            {
                progressBar.Value = percent;
                lblProgressPercent.Text = "%" + percent;
                if (!string.IsNullOrEmpty(status)) lblStatusMessage.Text = status;
                if (!string.IsNullOrEmpty(file)) lblCurrentFile.Text = file;
                if (total > 0 && lblFileCounter != null) lblFileCounter.Text = string.Format("Dosya: {0} / {1}", current, total);
            }));
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string workingDir, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                dynamic shell = Activator.CreateInstance(shellType);
                dynamic shortcut = shell.CreateShortcut(shortcutPath);
                shortcut.TargetPath = targetPath;
                shortcut.WorkingDirectory = workingDir;
                shortcut.Description = description;
                shortcut.IconLocation = targetPath + ",0";
                shortcut.Save();
            }
            catch { }
        }

        private void RegisterInControlPanel(string installDir, string exePath)
        {
            try
            {
                string keyPath = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\ULAK";
                using (var key = Registry.CurrentUser.CreateSubKey(keyPath))
                {
                    if (key != null)
                    {
                        string uninstallerPath = Path.Combine(installDir, "uninstall.exe");
                        key.SetValue("DisplayName", "ULAK - Ağ ve Güvenlik İstasyonu");
                        key.SetValue("DisplayVersion", "2.5.0");
                        key.SetValue("Publisher", "ULAK Team");
                        key.SetValue("DisplayIcon", uninstallerPath);
                        key.SetValue("InstallLocation", installDir);
                        key.SetValue("UninstallString", "\"" + uninstallerPath + "\"");
                        key.SetValue("QuietUninstallString", "\"" + uninstallerPath + "\" --silent");
                        key.SetValue("EstimatedSize", 260000, RegistryValueKind.DWord);
                        key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                        key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    }
                }
            }
            catch { }
        }

        private void CreateUninstaller(string installDir)
        {
            try
            {
                // 1. Copy self as uninstall.exe into installDir
                string currentExe = Assembly.GetExecutingAssembly().Location;
                string targetUninstaller = Path.Combine(installDir, "uninstall.exe");
                if (File.Exists(currentExe))
                {
                    File.Copy(currentExe, targetUninstaller, true);
                }

                // 2. Also write a fallback launcher uninstall.bat that opens the UI
                string batPath = Path.Combine(installDir, "uninstall.bat");
                string script = "@echo off\r\nstart \"\" \"%~dp0uninstall.exe\"\r\n";
                File.WriteAllText(batPath, script);
            }
            catch { }
        }

        // ==========================================
        // UI HELPERS
        // ==========================================
        private Border CreateBadge(string text)
        {
            return new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(25, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(8, 3, 8, 3),
                Margin = new Thickness(0, 0, 8, 0),
                Child = new TextBlock
                {
                    Text = text,
                    FontSize = 10,
                    FontWeight = FontWeights.Medium,
                    Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240))
                }
            };
        }

        private Border CreateCheckItem(string text)
        {
            return new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(25, 16, 185, 129)),
                CornerRadius = new CornerRadius(5),
                Padding = new Thickness(8, 3, 8, 3),
                Margin = new Thickness(0, 0, 10, 0),
                Child = new TextBlock
                {
                    Text = text,
                    FontSize = 10,
                    FontWeight = FontWeights.SemiBold,
                    Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153))
                }
            };
        }

        private Grid CreateSummaryRow(string label, string val)
        {
            var row = new Grid { Margin = new Thickness(0, 0, 0, 6) };
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(110) });
            row.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            row.Children.Add(new TextBlock
            {
                Text = label,
                FontSize = 10.5,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184))
            });

            var valBlock = new TextBlock
            {
                Text = val,
                FontSize = 10.5,
                FontWeight = FontWeights.SemiBold,
                Foreground = Brushes.White,
                TextTrimming = TextTrimming.CharacterEllipsis
            };
            Grid.SetColumn(valBlock, 1);
            row.Children.Add(valBlock);

            return row;
        }

        private Button CreatePrimaryButton(string text)
        {
            var btn = new Button
            {
                Content = text,
                FontSize = 12,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White,
                Background = new SolidColorBrush(Color.FromRgb(16, 185, 129)), // #10B981
                BorderThickness = new Thickness(0),
                Padding = new Thickness(22, 9, 22, 9),
                Cursor = Cursors.Hand,
                Effect = new DropShadowEffect
                {
                    Color = Color.FromRgb(16, 185, 129),
                    BlurRadius = 16,
                    Opacity = 0.5,
                    ShadowDepth = 0
                }
            };

            btn.MouseEnter += (s, e) => {
                btn.Background = new SolidColorBrush(Color.FromRgb(5, 150, 105)); // #059669
            };
            btn.MouseLeave += (s, e) => {
                btn.Background = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            };

            return btn;
        }

        private Button CreateSecondaryButton(string text)
        {
            var btn = new Button
            {
                Content = text,
                FontSize = 12,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                Background = new SolidColorBrush(Color.FromArgb(20, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(60, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(18, 8, 18, 8),
                Cursor = Cursors.Hand
            };

            btn.MouseEnter += (s, e) => {
                btn.Background = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255));
                btn.Foreground = Brushes.White;
            };
            btn.MouseLeave += (s, e) => {
                btn.Background = new SolidColorBrush(Color.FromArgb(20, 255, 255, 255));
                btn.Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225));
            };

            return btn;
        }
    }

    // =========================================================================
    // ULAK ÖZEL ARAYÜZLÜ KALDIRMA SİHİRBAZI (WPF MODERN OBSIDIAN GLASS UI)
    // =========================================================================
    public class UninstallerWindow : Window
    {
        private Grid mainGrid;
        private Border leftSidebar;
        private Grid contentArea;

        // Steps
        private Grid step1Confirm;
        private Grid step2Progress;
        private Grid step3Finished;

        // Step 1 Controls
        private CheckBox chkRemoveShortcuts;
        private CheckBox chkRemoveRegistry;
        private CheckBox chkRemoveUserData;
        private TextBlock lblInstallDirText;
        private TextBlock lblDiskSpaceText;
        private Button btnStartUninstall;

        // Step 2 Controls
        private ProgressBar progressBar;
        private TextBlock lblProgressPercent;
        private TextBlock lblStatusMessage;
        private TextBlock lblCurrentAction;
        private TextBox txtUninstallLog;

        // Step 3 Controls
        private Button btnCloseFinished;

        // Step Indicators
        private Border[] stepIndicators = new Border[3];
        private TextBlock[] stepTexts = new TextBlock[3];

        private string installPath;
        private BitmapImage logoImage;

        public UninstallerWindow(string targetInstallDir)
        {
            this.Title = "ULAK - Sistemden Kaldırma Sihirbazı";
            this.Width = 860;
            this.Height = 560;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            this.WindowStyle = WindowStyle.None;
            this.AllowsTransparency = true;
            this.Background = Brushes.Transparent;
            this.ResizeMode = ResizeMode.NoResize;

            if (string.IsNullOrEmpty(targetInstallDir) || !Directory.Exists(targetInstallDir))
            {
                targetInstallDir = ResolveInstallPath();
            }
            this.installPath = targetInstallDir;

            LoadLogo();
            BuildUI();
            ShowStep(1);
        }

        private void LoadLogo()
        {
            try
            {
                var asm = Assembly.GetExecutingAssembly();
                using (var stream = asm.GetManifestResourceStream("ULAK.logo.png"))
                {
                    if (stream != null)
                    {
                        var bmp = new BitmapImage();
                        bmp.BeginInit();
                        bmp.StreamSource = stream;
                        bmp.CacheOption = BitmapCacheOption.OnLoad;
                        bmp.EndInit();
                        logoImage = bmp;
                    }
                }
            }
            catch { }
        }

        private string ResolveInstallPath()
        {
            try
            {
                string keyPath = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\ULAK";
                using (var key = Registry.CurrentUser.OpenSubKey(keyPath))
                {
                    if (key != null)
                    {
                        var loc = key.GetValue("InstallLocation") as string;
                        if (!string.IsNullOrEmpty(loc) && Directory.Exists(loc)) return loc;
                    }
                }
            }
            catch { }

            string def = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Programs", "ULAK");
            if (Directory.Exists(def)) return def;

            try
            {
                string currentDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
                if (File.Exists(Path.Combine(currentDir, "ULAK.exe"))) return currentDir;
            }
            catch { }

            return def;
        }

        private void BuildUI()
        {
            // Outer Glowing Frame (Obsidian Liquid Glass with Crimson Accent border)
            var outerBorder = new Border
            {
                CornerRadius = new CornerRadius(16),
                Background = new LinearGradientBrush(
                    Color.FromRgb(10, 14, 22),
                    Color.FromRgb(6, 9, 14),
                    new Point(0, 0),
                    new Point(1, 1)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(140, 239, 68, 68)),
                BorderThickness = new Thickness(1.4),
                Effect = new DropShadowEffect
                {
                    Color = Color.FromRgb(239, 68, 68),
                    BlurRadius = 38,
                    Opacity = 0.35,
                    ShadowDepth = 0
                }
            };

            mainGrid = new Grid();
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(46) }); // Header
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Body

            // 1. Header Bar (Draggable)
            var headerBar = BuildHeaderBar();
            Grid.SetRow(headerBar, 0);
            mainGrid.Children.Add(headerBar);

            // 2. Main Body Grid (Sidebar + Content)
            var bodyGrid = new Grid();
            bodyGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(260) });
            bodyGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

            leftSidebar = BuildSidebar();
            Grid.SetColumn(leftSidebar, 0);
            bodyGrid.Children.Add(leftSidebar);

            contentArea = new Grid { Margin = new Thickness(22, 16, 22, 18) };
            Grid.SetColumn(contentArea, 1);
            bodyGrid.Children.Add(contentArea);

            // Build Steps
            step1Confirm = BuildStep1Confirm();
            step2Progress = BuildStep2Progress();
            step3Finished = BuildStep3Finished();

            contentArea.Children.Add(step1Confirm);
            contentArea.Children.Add(step2Progress);
            contentArea.Children.Add(step3Finished);

            Grid.SetRow(bodyGrid, 1);
            mainGrid.Children.Add(bodyGrid);

            outerBorder.Child = mainGrid;
            this.Content = outerBorder;
        }

        private Grid BuildHeaderBar()
        {
            var header = new Grid
            {
                Background = new SolidColorBrush(Color.FromRgb(12, 17, 27))
            };
            header.MouseLeftButtonDown += (s, e) => { this.DragMove(); };

            var titlePanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(16, 0, 0, 0)
            };

            if (logoImage != null)
            {
                var iconImg = new Image
                {
                    Source = logoImage,
                    Width = 24,
                    Height = 24,
                    Margin = new Thickness(0, 0, 10, 0)
                };
                titlePanel.Children.Add(iconImg);
            }

            var appTitle = new TextBlock
            {
                Text = "ULAK",
                FontWeight = FontWeights.Bold,
                FontSize = 14,
                Foreground = Brushes.White,
                VerticalAlignment = VerticalAlignment.Center
            };
            titlePanel.Children.Add(appTitle);

            var badge = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(40, 239, 68, 68)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(90, 239, 68, 68)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(4),
                Margin = new Thickness(10, 0, 0, 0),
                Padding = new Thickness(7, 2, 7, 2),
                VerticalAlignment = VerticalAlignment.Center,
                Child = new TextBlock
                {
                    Text = "SİSTEMDEN KALDIRMA SİHİRBAZI",
                    FontSize = 9.5,
                    FontWeight = FontWeights.Bold,
                    Foreground = new SolidColorBrush(Color.FromRgb(248, 113, 113))
                }
            };
            titlePanel.Children.Add(badge);

            var verBadge = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(20, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(4),
                Margin = new Thickness(8, 0, 0, 0),
                Padding = new Thickness(6, 2, 6, 2),
                VerticalAlignment = VerticalAlignment.Center,
                Child = new TextBlock
                {
                    Text = "v2.5.0",
                    FontSize = 9.5,
                    Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225))
                }
            };
            titlePanel.Children.Add(verBadge);
            header.Children.Add(titlePanel);

            // Window Controls
            var controlPanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 10, 0)
            };

            var btnMin = new Button
            {
                Content = "—",
                Width = 34,
                Height = 30,
                Background = Brushes.Transparent,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                BorderThickness = new Thickness(0),
                FontSize = 13,
                Cursor = Cursors.Hand
            };
            btnMin.Click += (s, e) => { this.WindowState = WindowState.Minimized; };

            var btnClose = new Button
            {
                Content = "✕",
                Width = 34,
                Height = 30,
                Background = Brushes.Transparent,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                BorderThickness = new Thickness(0),
                FontSize = 12,
                Cursor = Cursors.Hand
            };
            btnClose.MouseEnter += (s, e) => {
                btnClose.Background = new SolidColorBrush(Color.FromRgb(220, 38, 38));
                btnClose.Foreground = Brushes.White;
            };
            btnClose.MouseLeave += (s, e) => {
                btnClose.Background = Brushes.Transparent;
                btnClose.Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184));
            };
            btnClose.Click += (s, e) => {
                if (MessageBox.Show("Kaldırma işleminden çıkmak istediğinize emin misiniz?", "Kaldırmayı İptal Et", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
                {
                    this.Close();
                }
            };

            controlPanel.Children.Add(btnMin);
            controlPanel.Children.Add(btnClose);
            header.Children.Add(controlPanel);

            return header;
        }

        private Border BuildSidebar()
        {
            var border = new Border
            {
                Background = new LinearGradientBrush(
                    Color.FromRgb(11, 16, 26),
                    Color.FromRgb(7, 10, 16),
                    new Point(0, 0),
                    new Point(0, 1)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(45, 255, 255, 255)),
                BorderThickness = new Thickness(0, 0, 1.2, 0),
                Padding = new Thickness(18, 20, 18, 18)
            };

            var mainStack = new Grid();
            mainStack.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Brand
            mainStack.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Steps
            mainStack.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Summary Bento card
            mainStack.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Footer specs

            // Brand Header
            var brandStack = new StackPanel { Margin = new Thickness(0, 0, 0, 18) };
            if (logoImage != null)
            {
                var bigLogo = new Image
                {
                    Source = logoImage,
                    Width = 60,
                    Height = 60,
                    HorizontalAlignment = HorizontalAlignment.Center,
                    Margin = new Thickness(0, 0, 0, 8),
                    Effect = new DropShadowEffect
                    {
                        Color = Color.FromRgb(239, 68, 68),
                        BlurRadius = 24,
                        Opacity = 0.5,
                        ShadowDepth = 0
                    }
                };
                brandStack.Children.Add(bigLogo);
            }

            var lblLogoText = new TextBlock
            {
                Text = "ULAK",
                FontSize = 20,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White,
                HorizontalAlignment = HorizontalAlignment.Center
            };
            brandStack.Children.Add(lblLogoText);

            var lblLogoSub = new TextBlock
            {
                Text = "Ağ ve Güvenlik İstasyonu",
                FontSize = 11,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 2, 0, 8)
            };
            brandStack.Children.Add(lblLogoSub);

            // Live status badge
            var liveBadge = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(30, 239, 68, 68)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(70, 239, 68, 68)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(10, 4, 10, 4),
                HorizontalAlignment = HorizontalAlignment.Center,
                Child = new StackPanel
                {
                    Orientation = Orientation.Horizontal,
                    Children = {
                        new Border {
                            Width = 7, Height = 7, CornerRadius = new CornerRadius(4),
                            Background = new SolidColorBrush(Color.FromRgb(248, 113, 113)),
                            Margin = new Thickness(0, 0, 6, 0),
                            VerticalAlignment = VerticalAlignment.Center
                        },
                        new TextBlock {
                            Text = "Kaldırma Modu",
                            FontSize = 10,
                            FontWeight = FontWeights.SemiBold,
                            Foreground = new SolidColorBrush(Color.FromRgb(248, 113, 113)),
                            VerticalAlignment = VerticalAlignment.Center
                        }
                    }
                }
            };
            brandStack.Children.Add(liveBadge);

            Grid.SetRow(brandStack, 0);
            mainStack.Children.Add(brandStack);

            // Step indicators (3 steps)
            var stepStack = new StackPanel { Margin = new Thickness(0, 0, 0, 16) };
            string[] stepNames = { "1. Onay & Tercihler", "2. Sistemden Temizleme", "3. Kaldırma Tamamlandı" };
            for (int i = 0; i < 3; i++)
            {
                var indBorder = new Border
                {
                    CornerRadius = new CornerRadius(8),
                    Background = Brushes.Transparent,
                    Padding = new Thickness(12, 7, 12, 7),
                    Margin = new Thickness(0, 0, 0, 4)
                };

                var txt = new TextBlock
                {
                    Text = stepNames[i],
                    FontSize = 11.5,
                    Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139)),
                    FontWeight = FontWeights.SemiBold
                };

                indBorder.Child = txt;
                stepIndicators[i] = indBorder;
                stepTexts[i] = txt;
                stepStack.Children.Add(indBorder);
            }
            Grid.SetRow(stepStack, 1);
            mainStack.Children.Add(stepStack);

            // Summary Bento Card
            var summaryCard = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(12),
                Margin = new Thickness(0, 4, 0, 14),
                VerticalAlignment = VerticalAlignment.Stretch
            };

            var fStack = new StackPanel();
            fStack.Children.Add(new TextBlock
            {
                Text = "SİLİNECEK BİLEŞENLER",
                FontSize = 9.5,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 0, 0, 8)
            });

            string[] features = {
                "🗑️ ULAK Masaüstü Çekirdeği",
                "🛡️ Güvenlik Duvarı & Servisler",
                "🔗 Masaüstü & Başlat Kısayolları",
                "📝 Windows Kayıt Defteri (Registry)"
            };

            foreach (var feat in features)
            {
                var fTxt = new TextBlock
                {
                    Text = feat,
                    FontSize = 10,
                    Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                    Margin = new Thickness(0, 0, 0, 5)
                };
                fStack.Children.Add(fTxt);
            }
            summaryCard.Child = fStack;
            Grid.SetRow(summaryCard, 2);
            mainStack.Children.Add(summaryCard);

            // Bottom Specs Card
            var bottomCard = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(30, 0, 0, 0)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Padding = new Thickness(10, 8, 10, 8)
            };
            var bStack = new StackPanel();
            bStack.Children.Add(new TextBlock
            {
                Text = "Windows 10 / 11 (64-bit)",
                FontSize = 10,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                HorizontalAlignment = HorizontalAlignment.Center
            });
            bStack.Children.Add(new TextBlock
            {
                Text = "Güvenli Temizleme • v2.5.0",
                FontSize = 9.5,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 2, 0, 0)
            });
            bottomCard.Child = bStack;
            Grid.SetRow(bottomCard, 3);
            mainStack.Children.Add(bottomCard);

            border.Child = mainStack;
            return border;
        }

        private void UpdateStepIndicators(int currentStep)
        {
            for (int i = 0; i < 3; i++)
            {
                int stepNum = i + 1;
                if (stepNum == currentStep)
                {
                    stepIndicators[i].Background = new SolidColorBrush(Color.FromArgb(40, 239, 68, 68));
                    stepIndicators[i].BorderBrush = new SolidColorBrush(Color.FromArgb(100, 239, 68, 68));
                    stepIndicators[i].BorderThickness = new Thickness(1);
                    stepTexts[i].Foreground = new SolidColorBrush(Color.FromRgb(248, 113, 113));
                }
                else if (stepNum < currentStep)
                {
                    stepIndicators[i].Background = Brushes.Transparent;
                    stepIndicators[i].BorderThickness = new Thickness(0);
                    stepTexts[i].Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184));
                }
                else
                {
                    stepIndicators[i].Background = Brushes.Transparent;
                    stepIndicators[i].BorderThickness = new Thickness(0);
                    stepTexts[i].Foreground = new SolidColorBrush(Color.FromRgb(71, 85, 105));
                }
            }
        }

        private void ShowStep(int step)
        {
            step1Confirm.Visibility = (step == 1) ? Visibility.Visible : Visibility.Collapsed;
            step2Progress.Visibility = (step == 2) ? Visibility.Visible : Visibility.Collapsed;
            step3Finished.Visibility = (step == 3) ? Visibility.Visible : Visibility.Collapsed;

            UpdateStepIndicators(step);
        }

        // ==========================================
        // STEP 1: ONAY VE BİLEŞEN TERCİHLERİ
        // ==========================================
        private Grid BuildStep1Confirm()
        {
            var grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Hero Banner
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Detail Bento
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Action Row

            // 1. Hero Warning Banner
            var hero = new Border
            {
                Background = new LinearGradientBrush(
                    Color.FromRgb(28, 15, 20),
                    Color.FromRgb(16, 12, 18),
                    new Point(0, 0), new Point(1, 1)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(70, 239, 68, 68)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(18, 14, 18, 14),
                Margin = new Thickness(0, 0, 0, 12)
            };

            var heroStack = new StackPanel();
            var heroTitleRow = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 4) };
            heroTitleRow.Children.Add(new TextBlock
            {
                Text = "ULAK Sisteminizden Kaldırılsın mı?",
                FontSize = 16.5,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White
            });
            heroStack.Children.Add(heroTitleRow);

            heroStack.Children.Add(new TextBlock
            {
                Text = "ULAK Ağ ve Güvenlik İstasyonu bilgisayarınızdan kaldırılacak. Lütfen temizlemek istediğiniz bileşenleri seçiniz.",
                FontSize = 11.5,
                Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                Margin = new Thickness(0, 0, 0, 8)
            });

            var badgeRow = new StackPanel { Orientation = Orientation.Horizontal };
            badgeRow.Children.Add(CreateBadge("⚠️ Geri Alınamaz İşlem"));
            badgeRow.Children.Add(CreateBadge("🛡️ Güvenli Temizlik"));
            heroStack.Children.Add(badgeRow);

            hero.Child = heroStack;
            Grid.SetRow(hero, 0);
            grid.Children.Add(hero);

            // 2. Bento Detail Card
            var detailCard = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(35, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(16),
                Margin = new Thickness(0, 0, 0, 12)
            };

            var detailStack = new StackPanel();

            // Path info
            detailStack.Children.Add(new TextBlock
            {
                Text = "KURULU KONUM VE BİLEŞENLER",
                FontSize = 10,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 0, 0, 6)
            });

            var pathBox = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(45, 0, 0, 0)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(50, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(10, 6, 10, 6),
                Margin = new Thickness(0, 0, 0, 10)
            };
            lblInstallDirText = new TextBlock
            {
                Text = string.IsNullOrEmpty(installPath) ? "Bilinmeyen Konum" : installPath,
                FontSize = 11,
                Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                TextTrimming = TextTrimming.CharacterEllipsis
            };
            pathBox.Child = lblInstallDirText;
            detailStack.Children.Add(pathBox);

            var spaceRow = new Grid { Margin = new Thickness(0, 0, 0, 14) };
            spaceRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            spaceRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            spaceRow.Children.Add(new TextBlock
            {
                Text = "Kazanılacak Disk Alanı:",
                FontSize = 11,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184))
            });

            lblDiskSpaceText = new TextBlock
            {
                Text = "~260 MB",
                FontSize = 11,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153))
            };
            Grid.SetColumn(lblDiskSpaceText, 1);
            spaceRow.Children.Add(lblDiskSpaceText);
            detailStack.Children.Add(spaceRow);

            // Separator
            detailStack.Children.Add(new Border
            {
                Height = 1,
                Background = new SolidColorBrush(Color.FromArgb(30, 255, 255, 255)),
                Margin = new Thickness(0, 0, 0, 12)
            });

            detailStack.Children.Add(new TextBlock
            {
                Text = "KALDIRMA TERCİHLERİ",
                FontSize = 10,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 0, 0, 8)
            });

            chkRemoveShortcuts = new CheckBox
            {
                Content = "Masaüstü ve Başlat Menüsü kısayollarını kaldır",
                IsChecked = true,
                Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                FontSize = 11,
                Margin = new Thickness(0, 0, 0, 8),
                Cursor = Cursors.Hand
            };
            detailStack.Children.Add(chkRemoveShortcuts);

            chkRemoveRegistry = new CheckBox
            {
                Content = "Windows Program Ekle/Kaldır ve kayıt defteri (Registry) girdilerini sil",
                IsChecked = true,
                Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240)),
                FontSize = 11,
                Margin = new Thickness(0, 0, 0, 8),
                Cursor = Cursors.Hand
            };
            detailStack.Children.Add(chkRemoveRegistry);

            chkRemoveUserData = new CheckBox
            {
                Content = "Kullanıcı profil verilerini, logları ve önbelleği de temizle (%APPDATA%\\ulak-windows)",
                IsChecked = false,
                Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                FontSize = 11,
                Cursor = Cursors.Hand
            };
            detailStack.Children.Add(chkRemoveUserData);

            detailCard.Child = detailStack;
            Grid.SetRow(detailCard, 1);
            grid.Children.Add(detailCard);

            // 3. Actions Row
            var actionGrid = new Grid();
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            var btnCancel = CreateSecondaryButton("Vazgeç");
            btnCancel.Click += (s, e) => { this.Close(); };
            Grid.SetColumn(btnCancel, 0);
            btnCancel.HorizontalAlignment = HorizontalAlignment.Left;
            actionGrid.Children.Add(btnCancel);

            btnStartUninstall = CreateDangerButton("🗑️ ULAK'ı Kaldır");
            btnStartUninstall.Click += (s, e) => { StartUninstall(); };
            Grid.SetColumn(btnStartUninstall, 1);
            actionGrid.Children.Add(btnStartUninstall);

            Grid.SetRow(actionGrid, 2);
            grid.Children.Add(actionGrid);

            return grid;
        }

        // ==========================================
        // STEP 2: SİSTEMDEN TEMİZLEME & CANLI LOG
        // ==========================================
        private Grid BuildStep2Progress()
        {
            var grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Hero Banner
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Progress Bar Card
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Console Log
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Bottom note

            // 1. Hero
            var hero = new Border
            {
                Background = new LinearGradientBrush(
                    Color.FromRgb(16, 23, 38),
                    Color.FromRgb(11, 16, 28),
                    new Point(0, 0), new Point(1, 1)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(60, 239, 68, 68)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(18, 12, 18, 12),
                Margin = new Thickness(0, 0, 0, 12)
            };

            var heroStack = new StackPanel();
            heroStack.Children.Add(new TextBlock
            {
                Text = "ULAK Sistemden Temizleniyor...",
                FontSize = 16,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White,
                Margin = new Thickness(0, 0, 0, 3)
            });
            heroStack.Children.Add(new TextBlock
            {
                Text = "Bileşenler, kısayollar ve sistem kayıtları kaldırılıyor. Lütfen işlem tamamlanana kadar bekleyiniz.",
                FontSize = 11,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184))
            });
            hero.Child = heroStack;
            Grid.SetRow(hero, 0);
            grid.Children.Add(hero);

            // 2. Progress Bar Card
            var progCard = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(35, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(14, 12, 14, 12),
                Margin = new Thickness(0, 0, 0, 10)
            };

            var pStack = new StackPanel();

            var statRow = new Grid { Margin = new Thickness(0, 0, 0, 6) };
            statRow.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            statRow.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            lblStatusMessage = new TextBlock
            {
                Text = "Kaldırma işlemi başlatılıyor...",
                FontSize = 11.5,
                FontWeight = FontWeights.SemiBold,
                Foreground = Brushes.White
            };
            Grid.SetColumn(lblStatusMessage, 0);
            statRow.Children.Add(lblStatusMessage);

            lblProgressPercent = new TextBlock
            {
                Text = "%0",
                FontSize = 12,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(Color.FromRgb(248, 113, 113))
            };
            Grid.SetColumn(lblProgressPercent, 1);
            statRow.Children.Add(lblProgressPercent);
            pStack.Children.Add(statRow);

            progressBar = new ProgressBar
            {
                Height = 12,
                Value = 0,
                Maximum = 100,
                Foreground = new SolidColorBrush(Color.FromRgb(239, 68, 68)),
                Background = new SolidColorBrush(Color.FromArgb(50, 0, 0, 0)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(60, 255, 255, 255)),
                BorderThickness = new Thickness(1)
            };
            pStack.Children.Add(progressBar);

            lblCurrentAction = new TextBlock
            {
                Text = "Hazırlanıyor...",
                FontSize = 10,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                Margin = new Thickness(0, 6, 0, 0),
                TextTrimming = TextTrimming.CharacterEllipsis
            };
            pStack.Children.Add(lblCurrentAction);

            progCard.Child = pStack;
            Grid.SetRow(progCard, 1);
            grid.Children.Add(progCard);

            // 3. Live Console Log Box
            var logCard = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(200, 5, 8, 14)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(45, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(10),
                Margin = new Thickness(0, 0, 0, 10)
            };

            txtUninstallLog = new TextBox
            {
                Background = Brushes.Transparent,
                Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
                BorderThickness = new Thickness(0),
                FontFamily = new FontFamily("Consolas"),
                FontSize = 10,
                IsReadOnly = true,
                TextWrapping = TextWrapping.Wrap,
                VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
                Text = "[BAŞLATILIYOR] ULAK Kaldırma Günlüğü..."
            };
            logCard.Child = txtUninstallLog;
            Grid.SetRow(logCard, 2);
            grid.Children.Add(logCard);

            var bottomNote = new TextBlock
            {
                Text = "İşlem sırasında lütfen bilgisayarınızı kapatmayınız.",
                FontSize = 10,
                Foreground = new SolidColorBrush(Color.FromRgb(100, 116, 139)),
                HorizontalAlignment = HorizontalAlignment.Center
            };
            Grid.SetRow(bottomNote, 3);
            grid.Children.Add(bottomNote);

            return grid;
        }

        // ==========================================
        // STEP 3: KALDIRMA TAMAMLANDI
        // ==========================================
        private Grid BuildStep3Finished()
        {
            var grid = new Grid();
            grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Celebration Card
            grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Action Row

            var card = new Border
            {
                Background = new LinearGradientBrush(
                    Color.FromRgb(14, 20, 32),
                    Color.FromRgb(10, 14, 22),
                    new Point(0, 0), new Point(1, 1)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(60, 16, 185, 129)),
                BorderThickness = new Thickness(1.2),
                CornerRadius = new CornerRadius(14),
                Padding = new Thickness(24),
                VerticalAlignment = VerticalAlignment.Center,
                HorizontalAlignment = HorizontalAlignment.Stretch
            };

            var stack = new StackPanel { HorizontalAlignment = HorizontalAlignment.Center };

            // Big Green Circle Checkmark
            var checkCircle = new Border
            {
                Width = 60,
                Height = 60,
                CornerRadius = new CornerRadius(30),
                Background = new SolidColorBrush(Color.FromArgb(40, 16, 185, 129)),
                BorderBrush = new SolidColorBrush(Color.FromRgb(16, 185, 129)),
                BorderThickness = new Thickness(2),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 14),
                Effect = new DropShadowEffect
                {
                    Color = Color.FromRgb(16, 185, 129),
                    BlurRadius = 24,
                    Opacity = 0.6,
                    ShadowDepth = 0
                },
                Child = new TextBlock
                {
                    Text = "✓",
                    FontSize = 28,
                    FontWeight = FontWeights.Bold,
                    Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153)),
                    HorizontalAlignment = HorizontalAlignment.Center,
                    VerticalAlignment = VerticalAlignment.Center
                }
            };
            stack.Children.Add(checkCircle);

            var title = new TextBlock
            {
                Text = "ULAK Başarıyla Kaldırıldı",
                FontSize = 19,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 6)
            };
            stack.Children.Add(title);

            var sub = new TextBlock
            {
                Text = "ULAK Ağ ve Güvenlik İstasyonu sisteminizden tamamen temizlendi.\nTercih ettiğiniz tüm bileşenler ve kısayollar silindi.",
                FontSize = 11.5,
                Foreground = new SolidColorBrush(Color.FromRgb(148, 163, 184)),
                TextAlignment = TextAlignment.Center,
                Margin = new Thickness(0, 0, 0, 18)
            };
            stack.Children.Add(sub);

            // Summary grid
            var sumCard = new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(30, 0, 0, 0)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(35, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(8),
                Padding = new Thickness(14, 10, 14, 10),
                Margin = new Thickness(0, 0, 0, 6)
            };
            var sumGrid = new StackPanel();
            sumGrid.Children.Add(CreateCheckItem("✓ Program dosyaları ve kitaplıklar silindi"));
            sumGrid.Children.Add(CreateCheckItem("✓ Masaüstü ve Başlat Menüsü bağlantıları temizlendi"));
            sumGrid.Children.Add(CreateCheckItem("✓ Windows Kayıt Defteri girdileri kaldırıldı"));
            sumCard.Child = sumGrid;
            stack.Children.Add(sumCard);

            card.Child = stack;
            Grid.SetRow(card, 0);
            grid.Children.Add(card);

            // Action Row
            var actionGrid = new Grid { Margin = new Thickness(0, 14, 0, 0) };
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            actionGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

            btnCloseFinished = CreatePrimaryButton("Tamamla ve Kapat");
            btnCloseFinished.Click += (s, e) =>
            {
                try
                {
                    string curExe = Assembly.GetExecutingAssembly().Location;
                    string curDir = Path.GetDirectoryName(curExe);
                    if (curDir.IndexOf("Temp", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        var psi = new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = "cmd.exe",
                            Arguments = string.Format("/c timeout /t 1 /nobreak >nul & rmdir /s /q \"{0}\"", curDir),
                            CreateNoWindow = true,
                            WindowStyle = System.Diagnostics.ProcessWindowStyle.Hidden
                        };
                        System.Diagnostics.Process.Start(psi);
                    }
                }
                catch { }

                this.Close();
            };
            Grid.SetColumn(btnCloseFinished, 1);
            actionGrid.Children.Add(btnCloseFinished);

            Grid.SetRow(actionGrid, 1);
            grid.Children.Add(actionGrid);

            return grid;
        }

        // ==========================================
        // UNINSTALL EXECUTION TASK
        // ==========================================
        private void StartUninstall()
        {
            ShowStep(2);

            bool removeShortcuts = chkRemoveShortcuts.IsChecked == true;
            bool removeRegistry = chkRemoveRegistry.IsChecked == true;
            bool removeUserData = chkRemoveUserData.IsChecked == true;

            Task.Run(() =>
            {
                try
                {
                    AppendLog("[BAŞLATILDI] ULAK Kaldırma Sihirbazı v2.5.0 çalışıyor...");
                    UpdateProgress(5, "Çalışan ULAK işlemleri kontrol ediliyor...", "İşlem kontrolü");

                    // 1. Kill running ULAK / electron processes
                    try
                    {
                        var procs = System.Diagnostics.Process.GetProcessesByName("ULAK");
                        foreach (var p in procs)
                        {
                            try
                            {
                                p.Kill();
                                p.WaitForExit(3000);
                                AppendLog("[İŞLEM] Çalışan ULAK.exe sonlandırıldı.");
                            }
                            catch { }
                        }
                    }
                    catch { }

                    Thread.Sleep(400);

                    // 2. Remove shortcuts
                    if (removeShortcuts)
                    {
                        UpdateProgress(25, "Masaüstü ve Başlat Menüsü kısayolları kaldırılıyor...", "Kısayollar");
                        string desktopLink = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "ULAK.lnk");
                        string userDesktopLink = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Desktop", "ULAK.lnk");
                        string startMenuLink = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "ULAK.lnk");
                        string commonStartMenu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonStartMenu), "Programs", "ULAK.lnk");

                        DeleteFileSafe(desktopLink);
                        DeleteFileSafe(userDesktopLink);
                        DeleteFileSafe(startMenuLink);
                        DeleteFileSafe(commonStartMenu);
                        AppendLog("[KISAYOL] Masaüstü ve Başlat Menüsü bağlantıları temizlendi.");
                    }

                    Thread.Sleep(300);

                    // 3. Remove Registry
                    if (removeRegistry)
                    {
                        UpdateProgress(45, "Windows Kayıt Defteri (Registry) temizleniyor...", "Kayıt Defteri");
                        try
                        {
                            Registry.CurrentUser.DeleteSubKeyTree(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\ULAK", false);
                            AppendLog("[REGISTRY] Program Ekle/Kaldır sistem kaydı silindi.");
                        }
                        catch { }

                        try
                        {
                            Registry.CurrentUser.DeleteSubKeyTree(@"Software\ULAK", false);
                        }
                        catch { }
                    }

                    Thread.Sleep(300);

                    // 4. Remove installation files
                    UpdateProgress(60, "Program dosyaları ve bileşenler siliniyor...", "Dosyalar temizleniyor");
                    if (!string.IsNullOrEmpty(installPath) && Directory.Exists(installPath))
                    {
                        try
                        {
                            string[] files = Directory.GetFiles(installPath, "*", SearchOption.AllDirectories);
                            int total = files.Length;
                            int count = 0;

                            foreach (var file in files)
                            {
                                count++;
                                try
                                {
                                    File.SetAttributes(file, FileAttributes.Normal);
                                    File.Delete(file);
                                }
                                catch { }

                                if (count % 8 == 0 || count == total)
                                {
                                    int pct = 60 + (int)(30.0 * count / Math.Max(1, total));
                                    UpdateProgress(pct, "Program dosyaları siliniyor...", Path.GetFileName(file));
                                }
                            }

                            // Delete directory
                            try
                            {
                                Directory.Delete(installPath, true);
                                AppendLog("[DOSYA] Program dizini başarıyla silindi: " + installPath);
                            }
                            catch (Exception ex)
                            {
                                AppendLog("[UYARI] Dizin silinirken: " + ex.Message);
                            }
                        }
                        catch (Exception ex)
                        {
                            AppendLog("[UYARI] Dosya temizliği hatası: " + ex.Message);
                        }
                    }

                    // 5. Remove User Data (optional)
                    if (removeUserData)
                    {
                        UpdateProgress(95, "Kullanıcı profil verileri temizleniyor...", "Önbellek & Veritabanı");
                        string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "ulak-windows");
                        string localAppDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ulak-windows");

                        DeleteDirSafe(appDataDir);
                        DeleteDirSafe(localAppDataDir);
                        AppendLog("[VERİ] Kullanıcı önbellek ve ayar klasörleri temizlendi.");
                    }

                    UpdateProgress(100, "ULAK başarıyla kaldırıldı!", "Kaldırma işlemi tamamlandı.");
                    AppendLog("[TAMAMLANDI] ULAK Ağ ve Güvenlik İstasyonu sisteminizden tamamen kaldırıldı.");

                    Thread.Sleep(600);

                    Dispatcher.Invoke((Action)(() =>
                    {
                        ShowStep(3);
                    }));
                }
                catch (Exception ex)
                {
                    Dispatcher.Invoke((Action)(() =>
                    {
                        MessageBox.Show("Kaldırma sırasında bir hata oluştu: " + ex.Message, "Kaldırma Hatası", MessageBoxButton.OK, MessageBoxImage.Warning);
                        ShowStep(3);
                    }));
                }
            });
        }

        private void AppendLog(string message)
        {
            Dispatcher.Invoke((Action)(() =>
            {
                if (txtUninstallLog != null)
                {
                    string time = DateTime.Now.ToString("HH:mm:ss");
                    txtUninstallLog.AppendText(string.Format("\n[{0}] {1}", time, message));
                    txtUninstallLog.ScrollToEnd();
                }
            }));
        }

        private void UpdateProgress(int percent, string status, string action)
        {
            Dispatcher.Invoke((Action)(() =>
            {
                if (progressBar != null) progressBar.Value = percent;
                if (lblProgressPercent != null) lblProgressPercent.Text = "%" + percent;
                if (lblStatusMessage != null && !string.IsNullOrEmpty(status)) lblStatusMessage.Text = status;
                if (lblCurrentAction != null && !string.IsNullOrEmpty(action)) lblCurrentAction.Text = action;
            }));
        }

        private void DeleteFileSafe(string path)
        {
            try
            {
                if (File.Exists(path))
                {
                    File.SetAttributes(path, FileAttributes.Normal);
                    File.Delete(path);
                }
            }
            catch { }
        }

        private void DeleteDirSafe(string path)
        {
            try
            {
                if (Directory.Exists(path))
                {
                    Directory.Delete(path, true);
                }
            }
            catch { }
        }

        // ==========================================
        // UI HELPERS
        // ==========================================
        private Border CreateBadge(string text)
        {
            return new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(25, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(6),
                Padding = new Thickness(8, 3, 8, 3),
                Margin = new Thickness(0, 0, 8, 0),
                Child = new TextBlock
                {
                    Text = text,
                    FontSize = 10,
                    FontWeight = FontWeights.Medium,
                    Foreground = new SolidColorBrush(Color.FromRgb(226, 232, 240))
                }
            };
        }

        private Border CreateCheckItem(string text)
        {
            return new Border
            {
                Background = new SolidColorBrush(Color.FromArgb(25, 16, 185, 129)),
                CornerRadius = new CornerRadius(5),
                Padding = new Thickness(8, 4, 8, 4),
                Margin = new Thickness(0, 0, 0, 6),
                Child = new TextBlock
                {
                    Text = text,
                    FontSize = 10.5,
                    FontWeight = FontWeights.SemiBold,
                    Foreground = new SolidColorBrush(Color.FromRgb(52, 211, 153))
                }
            };
        }

        private Button CreateDangerButton(string text)
        {
            var btn = new Button
            {
                Content = text,
                FontSize = 12,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White,
                Background = new SolidColorBrush(Color.FromRgb(239, 68, 68)),
                BorderThickness = new Thickness(0),
                Padding = new Thickness(22, 9, 22, 9),
                Cursor = Cursors.Hand,
                Effect = new DropShadowEffect
                {
                    Color = Color.FromRgb(239, 68, 68),
                    BlurRadius = 16,
                    Opacity = 0.5,
                    ShadowDepth = 0
                }
            };

            btn.MouseEnter += (s, e) => {
                btn.Background = new SolidColorBrush(Color.FromRgb(220, 38, 38));
            };
            btn.MouseLeave += (s, e) => {
                btn.Background = new SolidColorBrush(Color.FromRgb(239, 68, 68));
            };

            return btn;
        }

        private Button CreatePrimaryButton(string text)
        {
            var btn = new Button
            {
                Content = text,
                FontSize = 12,
                FontWeight = FontWeights.Bold,
                Foreground = Brushes.White,
                Background = new SolidColorBrush(Color.FromRgb(16, 185, 129)),
                BorderThickness = new Thickness(0),
                Padding = new Thickness(22, 9, 22, 9),
                Cursor = Cursors.Hand,
                Effect = new DropShadowEffect
                {
                    Color = Color.FromRgb(16, 185, 129),
                    BlurRadius = 16,
                    Opacity = 0.5,
                    ShadowDepth = 0
                }
            };

            btn.MouseEnter += (s, e) => {
                btn.Background = new SolidColorBrush(Color.FromRgb(5, 150, 105));
            };
            btn.MouseLeave += (s, e) => {
                btn.Background = new SolidColorBrush(Color.FromRgb(16, 185, 129));
            };

            return btn;
        }

        private Button CreateSecondaryButton(string text)
        {
            var btn = new Button
            {
                Content = text,
                FontSize = 12,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225)),
                Background = new SolidColorBrush(Color.FromArgb(20, 255, 255, 255)),
                BorderBrush = new SolidColorBrush(Color.FromArgb(60, 255, 255, 255)),
                BorderThickness = new Thickness(1),
                Padding = new Thickness(18, 8, 18, 8),
                Cursor = Cursors.Hand
            };

            btn.MouseEnter += (s, e) => {
                btn.Background = new SolidColorBrush(Color.FromArgb(40, 255, 255, 255));
                btn.Foreground = Brushes.White;
            };
            btn.MouseLeave += (s, e) => {
                btn.Background = new SolidColorBrush(Color.FromArgb(20, 255, 255, 255));
                btn.Foreground = new SolidColorBrush(Color.FromRgb(203, 213, 225));
            };

            return btn;
        }
    }

}
