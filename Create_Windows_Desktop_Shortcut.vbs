Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\Mersal Info Center.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)

currentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

oLink.TargetPath = currentDirectory & "\Start-Mersal.bat"
oLink.WorkingDirectory = currentDirectory
oLink.IconLocation = currentDirectory & "\src\assets\logo.ico"
oLink.Description = "Start Mersal Info Center on Windows"
oLink.Save

MsgBox "Windows Desktop shortcut created successfully on your Desktop!", vbInformation, "Mersal Info Center"
