$p = 'd:\NUBJobs-full\server\prisma\schema.prisma'
$l = [System.Collections.Generic.List[string]](Get-Content $p)

function Insert-After($anchor, $afterPattern, $lines) {
  for ($i = $anchor; $i -lt $l.Count; $i++) {
    if ($l[$i] -match $afterPattern) {
      for ($k = $lines.Count - 1; $k -ge 0; $k--) { $l.Insert($i + 1, $lines[$k]) }
      return
    }
  }
  throw ('pattern not found: ' + $afterPattern)
}

# 1) Notification: social attribution fields (skip if already applied)
$nStart = ($l | Select-String -SimpleMatch 'model Notification {').LineNumber - 1
$already = $false
for ($i = $nStart; $i -lt $nStart + 20 -and $i -lt $l.Count; $i++) { if ($l[$i] -match 'fromUserId') { $already = $true } }
if (-not $already) {
  Insert-After $nStart 'isRead\s+Boolean' @(
    '',
    '  // Social attribution (spec: Notification fromUser/post/comment/message)',
    '  fromUserId        String?',
    '  postId            String?',
    '  commentId         String?',
    '  messageId         String?'
  )
}

# 2) NotificationType enum: add FOLLOW/LIKE/COMMENT/MENTION (idempotent)
$eStart = ($l | Select-String -SimpleMatch 'enum NotificationType {').LineNumber - 1
if (-not ($l -contains '  FOLLOW')) {
  for ($i = $eStart; $i -lt $l.Count; $i++) {
    if ($l[$i].Trim() -eq '}') {
      foreach ($v in @('  MENTION', '  COMMENT', '  LIKE', '  FOLLOW')) { $l.Insert($i, $v) }
      break
    }
  }
}

# 3) Message: photoUrl (idempotent)
$mStart = ($l | Select-String -SimpleMatch 'model Message {').LineNumber - 1
$msgHasPhoto = $false
for ($i = $mStart; $i -lt $mStart + 40 -and $i -lt $l.Count; $i++) { if ($l[$i] -match 'photoUrl') { $msgHasPhoto = $true } }
if (-not $msgHasPhoto) {
  Insert-After $mStart 'content\s+String' @('  photoUrl          String?   // optional photo in a DM (spec: Message)')
}

[System.IO.File]::WriteAllLines($p, $l)
Write-Output 'schema edits applied'
