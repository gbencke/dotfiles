set foldmethod=indent
set foldlevel=99

" Shared Clipboard with Ubuntu 
set clipboard=unnamedplus
" No text wrapping
set nowrap

"setting tabs and so on...
autocmd Filetype javascript setlocal ts=4 sts=4 sw=4
autocmd Filetype python setlocal ts=4 sts=4 sw=4

nnoremap <space> za

"My plugins
call plug#begin('~/.vim/plugged')
Plug 'junegunn/vim-easy-align'
Plug 'https://github.com/pangloss/vim-javascript'
Plug 'https://github.com/junegunn/vim-plug.git'
Plug 'https://github.com/tpope/vim-fugitive.git'
Plug 'scrooloose/nerdtree', { 'on':  'NERDTreeToggle' }
Plug 'vim-scripts/indentpython.vim'
Plug 'scrooloose/syntastic'
Plug 'https://github.com/Yggdroot/indentLine'
Plug 'https://github.com/juanedi/predawn.vim'
Plug 'https://github.com/vim-scripts/repmo.vim/'
Plug 'vim-airline/vim-airline'
Plug 'vim-airline/vim-airline-themes'
Plug 'mattn/emmet-vim'
Plug 'cakebaker/scss-syntax.vim'
call plug#end()


set encoding=utf-8
set nu
set mouse=a

"Configure Status Line
if has('statusline')
      set laststatus=2
      set statusline=%<%f\    
      set statusline+=%w%h%m%r 
      set statusline+=%{fugitive#statusline()} 
      set statusline+=\ [%{&ff}/%Y]            
      set statusline+=\ [%{getcwd()}]          
      set statusline+=%#warningmsg#
      set statusline+=%{SyntasticStatuslineFlag()}
      set statusline+=%*
      let g:syntastic_enable_signs=1
      set statusline+=%=%-14.(%l,%c%V%)\ %p%%  
endif

colorscheme elflord


