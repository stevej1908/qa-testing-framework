' Create Desktop Shortcut for Testing Framework
Set WshShell = CreateObject("WScript.Shell")
strDesktop = WshShell.SpecialFolders("Desktop")

' Create the shortcut
Set oShortcut = WshShell.CreateShortcut(strDesktop & "\Testing Framework.lnk")
oShortcut.TargetPath = "C:\Users\steve\qa-testing-framework\Start-TF.bat"
oShortcut.WorkingDirectory = "C:\Users\steve\qa-testing-framework"
oShortcut.Description = "Launch Testing Framework Portal with Playwright Integration"
oShortcut.IconLocation = "%SystemRoot%\System32\SHELL32.dll,21"
oShortcut.Save

WScript.Echo "Desktop shortcut created: Testing Framework"
