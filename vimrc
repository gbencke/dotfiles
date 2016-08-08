
set foldmethod=indent
set foldlevel=99

nnoremap <space> za

call plug#begin('~/.vim/plugged')

Plug 'junegunn/vim-easy-align'
Plug 'https://github.com/junegunn/vim-github-dashboard.git'
Plug 'https://github.com/junegunn/vim-plug.git'
Plug 'https://github.com/tpope/vim-fugitive.git'
Plug 'https://github.com/scrooloose/syntastic.git'
Plug 'SirVer/ultisnips' | Plug 'honza/vim-snippets'
Plug 'scrooloose/nerdtree', { 'on':  'NERDTreeToggle' }
Plug 'tmhedberg/SimpylFold'
Plug 'vim-scripts/indentpython.vim'
Plug 'Valloric/YouCompleteMe'
Plug 'scrooloose/syntastic'
Plug 'nvie/vim-flake8'
Plug 'https://github.com/Yggdroot/indentLine'
Plug 'https://github.com/juanedi/predawn.vim'
Plug 'https://github.com/vim-scripts/repmo.vim/'

call plug#end()

set encoding=utf-8
set nu


au BufNewFile,BufRead *.py
    \ set tabstop=4
"    \ set softtabstop=4
    \ set shiftwidth=4
    \ set textwidth=79
    \ set expandtab
    \ set autoindent
    \ set fileformat=unix

"au BufNewFile,BufRead *.js, *.html, *.css
"    \ set tabstop=2
"    \ set softtabstop=2
"    \ set shiftwidth=2

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

let g:EclimCompletionMethod='omnifunc'

colorscheme desert

map <up> <nop>
map <down> <nop>
map <left> <nop>
map <right> <nop>

imap <up> <nop>
imap <down> <nop>
imap <left> <nop>
imap <right> <nop>

