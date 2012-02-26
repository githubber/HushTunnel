#!/usr/bin/perl

use strict;

$|++;

my $path=__FILE__;
$path=~s/\/[^\/]*$//sm;
chdir($path);

'rm -f ../defaults/preferences/hushtunnel.js' if (-e '../defaults/preferences/hushtunnel.js');

my $ssh = '';
my $sshpass = '';
if(-e '/bin/ssh'){
  $ssh='/bin/ssh';
}elsif(-e '/usr/bin/ssh'){
  $ssh='/usr/bin/ssh';
}elsif(-e '/usr/local/bin/ssh'){
  $ssh='/usr/local/bin/ssh';
}
exit if(length($ssh)<1);

if(-e 'sshpass'){
  $sshpass='./sshpass';
}elsif(-e '/bin/sshpass'){
  $sshpass='/bin/sshpass';
}elsif(-e '/usr/bin/sshpass'){
  $sshpass='/usr/bin/sshpass';
}elsif(-e '/usr/local/bin/sshpass'){
  $sshpass='/usr/local/bin/sshpass';
}
if(length($sshpass)<1){
   chdir('./sshpass-src') || die "$!";
   open(LOG, '+>>log.txt') || die "$!";
   open(FILE, './configure|') || die "$!";
   while(<FILE>){
     print LOG $_;
   }
   close(FILE);
   open(FILE, 'make|') || die "$!";
   while(<FILE>){
     print LOG $_;
   }
   close(FILE);
   close(LOG);
   exit if(!-e 'sshpass');
   system('mv ./sshpass ../sshpass');
   chdir('../') || die "$!";
}

my $pw = shift @ARGV;
my $cmd = $sshpass.' -p '.$pw.' '.$ssh.' '.join(' ',@ARGV);

defined(my $pid=fork) || die "$!";
if($pid){
  waitpid($pid,0);
  $cmd = pop @ARGV;
  $pid = join("\n", grep(!/perl/i,grep( /\Q$cmd\E/, split("\n",`ps -ax`))));
  $pid =~s/^[\r\n\s\t]+//gsm;
  $pid =~s/[^0-9]+.*$//gsm;
  $pid+=0;
  if($pid>0){
     $SIG{'HUP'}=$SIG{'KILL'}=$SIG{'QUIT'}=$SIG{'TERM'}=$SIG{'STOP'}=$SIG{'ABRT'}=$SIG{'ALRM'}=sub{kill(-9,$pid) if($pid);exit;};
     my $apid = $$;
     my $zpid = fork;
     if($zpid){
       waitpid($zpid,0);
     }else{
        my $timeout=2880;
        while(--$timeout){
           sleep(30);
           last if(!kill(0,$pid) || !kill(0,$apid));
        }
        kill(-9,$pid);
        kill(-9,$apid);
     }
  }

}else{
  exec($cmd);
}

