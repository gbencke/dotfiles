# On /etc/default/grub, change:
# GRUB_DEFAULT=2

if test "$#" -ne 1;
      then echo 'Need to specify the default entry for grub: windows or arch' ; exit -1
fi

if test "$1" == 'windows';
then COMMAND="s/GRUB_DEFAULT=0/GRUB_DEFAULT=2/" 
fi
if test "$1" == 'arch';
then COMMAND="s/GRUB_DEFAULT=2/GRUB_DEFAULT=0/" 
fi

if test "$COMMAND" == '';
then echo 'Default entry is not recognized '; exit -1;
fi

sudo sed -i $COMMAND /etc/default/grub
sudo grub-mkconfig -o /boot/grub/grub.cfg

