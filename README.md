# DotFiles

Dotfiles are the configuration and preferences files that are used to setup any
development box according to the developer's preferences and workflow.

In these repo, we have the following sections:

* **NPM Configuration**: Default Node modules to be used on all host installations
* **Shells**: RC scripts for all used shells
* **VIM Configuration**: Scripts for the administration of the VIM instalation in a
  particular host. Plugins, Default Configurations, etc...
* **GIT Configuration**: Default git configuration files
* **Window Manager Configuration**: Default configuration of fonts, styles, window
  borders and many others for the i3 tiling window manager
* **Host Default Initial Configuration**: Default initial configuration of packages
  and its instalation, to be run just after the VM is available and its shell is
accessible. Scripts for both ubuntu and arch distributions.

## VIM Configuration

Vim is my favorite text editor mainly as it is available on any platform,
operating system and hardware. As a plugin it is also available on almost all
modern graphical IDEs.

Such versatility comes with the cost that it is necessary to switch from a
TTY-based code editing mode to a modal-based code editing. In a TTY-based editor
we just move around with the cursor, changing and adding characters. In a modal
editor, we have differente "Editing modes", and each one of those modes has
"commands" that do the actual editing of the text.

The available scripts are:
* **clean_vim.sh**: Cleans the current vimrc configuration and all the downloaded VIM
plugins and theirs configurations
* **switch_vimrc.sh**: Change the current vimrc to the mode specified as parameter to
the script (Currently: js, python, regular), downloads all necessary plugins and
update their configuration

The available configurations are:
* **vimrc**: The default minimalistic vimrc configuration
* **vimrc_javascript**: My default vimrc configuration for javascript
* **vimrc_python**: My default python configuration
* **vimrc_windows**: My default windows configuration
* **vsvim**: configuration for VsVim Plugin for visual studio


## GIT Configuration

The gitconfig file that contains my default email and name to be used on git
repositories


## Host Default Initial Configuration

When we start a VM on a PaaS Service like AWS or GoogleCloud, or even when we
create a local VM, it is normally necessary to download and install dozens of
packages, each one with its own settings and dependencies, in order to gain time
and automate such process, I created my default initialization scripts for VMs
and hosts
* **Arch**: Arch has quickly become my favorite linux distro, as it thrives for 
technical excellence and not user-friendliness (a trade-off very appealing to me).
It is very lightweight and allows fine-tuning of the development environment. I use
on arch several scripts that need to be run on the indicated order below:
    * **arch.000.base.sh**: Base files for arch instalattion on AWS
    * **arch.001.chromium.sh**:  Chromium installation on AWS or Local VM
    * **arch.002.vim.sh**: Vim instalation scripts (python development default)
    * **Window Manager Configuration**: The tiling window manager is in my opinion the 
    best option for GUI for programming professionals, as it has a unsurpassable degree 
    of customization available for the user. It is not a kind of software to be used by 
    beginners or non-professionals. As every advanced and highly-customizable software, 
    its cost is the amount of work that is needed in order to completely configure it. 
    For that there are the following folders with my default configurations:
        * **i3**: The configuration for the i3 window manager
    * **Auxiliary Scripts**: The following scripts are used on the scripts above
        * **termite**: The configuration for the termite terminal
        * **pacman**: The configuration for the pacman package manager
        * **vnc**: The configuration for the vnc remote desktop

* **Ubuntu**: Ubuntu is still the workhorse of the linux distros, and the most common to be
found on linux providers. It has a lot of opiniated towards the end user, so sometimes
it is a difficult to create the best development environments
    * **vm_minimal_script.sh**: The Minimal script to be run, useful for data
  science vms that are normally necessary to perform a certain computation and
after that specific task, to be shutdown
    * **vm_minimal_gui_script.sh**: Same as above, but with GUI and VNC
    * **host_full_new_script.sh**: A Full development environment to be used on new
hosts.
    * **start scripts**: Collection of simple start scripts to be placed on the home 
folder of each user
* **Dynamic SWAP Memory Allocation**: For some large computations, as a safety measure, 
it is advisable to allocate some disk space for swap, which adds to the currently 
available RAM memory. This can avoid many processess being killed by the O.S. 
due to the lack of available
memory.
    * **create_swap.sh**: Creates a region of swap memory using the size passed as parameter
and the file name also passed as parameter
    * **drop_swap.sh**: switches off the swap memory file passed by parameter and deallocates
it from the operation system memory
* **Wallpaper**: A Nice collection for wallpapers for the GUI linux distributions

