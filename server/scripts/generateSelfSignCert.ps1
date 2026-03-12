$certname = "spo-rag-001"
$cert = New-SelfSignedCertificate -Subject "CN=$certname" -CertStoreLocation "Cert:\CurrentUser\My" -KeyExportPolicy Exportable  -KeySpec Signature -KeyLength 2048 -KeyAlgorithm RSA -HashAlgorithm SHA256

 ## this generate the .cer which needs to be uploaded to Azure Portal
 Export-Certificate -Cert $cert -FilePath "C:\Users\admin\Desktop\$certname.cer"   ## Specify your preferred location


 ## current executing path location
 

Export-PfxCertificate -Cert $cert -FilePath "${(Get-Location).Path}\$certname.pfx" 