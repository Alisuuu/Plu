document.addEventListener('DOMContentLoaded', () => {
    const m3uFileName = 'list.m3u'; // <-- Substitua pelo nome do seu arquivo M3U
    const playlistElement = document.getElementById('playlist');
    const mediaPlayer = document.getElementById('mediaPlayer'); // Referencia o elemento <video>

    // Limpa a mensagem de carregamento inicial
    playlistElement.innerHTML = '';

    // Função para buscar e analisar o arquivo M3U
    async function loadM3uPlaylist() {
        try {
            const response = await fetch(m3uFileName);
            if (!response.ok) {
                throw new Error(`Erro ao carregar a playlist: ${response.statusText}`);
            }
            const m3uText = await response.text();
            parseM3u(m3uText);
        } catch (error) {
            console.error('Erro ao carregar ou analisar a playlist:', error);
            playlistElement.innerHTML = '<li>Erro ao carregar a playlist. Verifique o nome do arquivo e se o GitHub Pages está ativo.</li>';
        }
    }

    // Função para analisar o texto do arquivo M3U
    function parseM3u(m3uText) {
        const lines = m3uText.split('\n');
        const tracks = [];
        let currentTrack = {};

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('#EXTINF:')) {
                // Extrai a duração e o título
                const info = trimmedLine.substring(8).split(',');
                currentTrack.duration = info[0] || 'N/A'; // Duração (pode ser -1 para streams)
                currentTrack.title = info[1] ? info[1].trim() : 'Faixa Desconhecida';

                // Procura por atributos adicionais como tvg-id, tvg-name, tvg-logo, group-title
                const attributesRegex = /([\w-]+)="(.*?)"/g;
                let match;
                while ((match = attributesRegex.exec(trimmedLine)) !== null) {
                     currentTrack[match[1]] = match[2];
                }


            } else if (trimmedLine && !trimmedLine.startsWith('#')) {
                // Assume que a linha que não começa com # é a URL do stream
                currentTrack.url = trimmedLine;
                if (currentTrack.url) {
                    tracks.push(currentTrack);
                }
                currentTrack = {}; // Reinicia para a próxima faixa
            }
        }

        displayPlaylist(tracks);
    }

    // Função para exibir a playlist na página (AGORA COM LOGOS)
    function displayPlaylist(tracks) {
        if (tracks.length === 0) {
            playlistElement.innerHTML = '<li>Nenhum canal encontrado na playlist.</li>';
            return;
        }

        tracks.forEach(track => {
            const listItem = document.createElement('li');

            // Cria um elemento de imagem para o logo
            if (track['tvg-logo']) {
                const logoImg = document.createElement('img');
                logoImg.src = track['tvg-logo'];
                logoImg.alt = track['tvg-name'] || track.title || 'Logo do canal';
                listItem.appendChild(logoImg); // Adiciona a imagem ao item da lista
            }

            // Cria um span para o texto do canal (nome)
            const channelNameSpan = document.createElement('span');
            channelNameSpan.textContent = track['tvg-name'] || track.title || 'Nome do Canal Desconhecido';
            listItem.appendChild(channelNameSpan);


            listItem.dataset.url = track.url; // Armazena a URL no atributo de dados

            listItem.addEventListener('click', () => {
                playTrack(listItem);
            });

            playlistElement.appendChild(listItem);
        });
    }

    // Função para reproduzir a faixa selecionada (SEM ALTERAÇÕES NECESSÁRIAS)
    function playTrack(selectedItem) {
        const streamUrl = selectedItem.dataset.url;

        // Remove a classe 'active' de todos os itens e adiciona ao item selecionado
        document.querySelectorAll('#playlist li').forEach(item => {
            item.classList.remove('active');
        });
        selectedItem.classList.add('active');

        // Verifica se o stream é HLS e se hls.js é suportado
        if (streamUrl.endsWith('.m3u8') && Hls.isSupported()) {
            // Se houver uma instância HLS anterior, destrói antes de criar uma nova
             if (mediaPlayer.hls) {
                mediaPlayer.hls.destroy();
             }
            const hls = new Hls();
            mediaPlayer.hls = hls; // Armazena a instância HLS no elemento de mídia
            hls.loadSource(streamUrl);
            hls.attachMedia(mediaPlayer);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                mediaPlayer.play();
            });
             hls.on(Hls.Events.ERROR, function (event, data) {
                console.error('HLS.js error:', data);
                 // Tenta reproduzir diretamente caso hls.js falhe (pode não funcionar dependendo do stream)
                mediaPlayer.src = streamUrl;
                mediaPlayer.play().catch(e => console.error("Erro ao tentar reproduzir diretamente:", e));

            });
        } else {
             // Para outros formatos (mp4, etc.) ou se hls.js não for suportado
             // Certifica-se de destruir a instância HLS se existir
             if (mediaPlayer.hls) {
                mediaPlayer.hls.destroy();
                mediaPlayer.hls = null;
             }
            mediaPlayer.src = streamUrl;
            mediaPlayer.play().catch(e => console.error("Erro ao reproduzir:", e));
        }
    }

    // Carrega a playlist quando a página é carregada
    loadM3uPlaylist();
});