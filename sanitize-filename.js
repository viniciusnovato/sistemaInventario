// Função para sanitizar nomes de arquivos
function sanitizeFileName(fileName) {
    return fileName
        .normalize('NFD') // Normalizar caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^\w\s.-]/g, '') // Remover emojis e caracteres especiais
        .replace(/\s+/g, '_') // Substituir espaços por underscore
        .toLowerCase(); // Converter para minúsculas
}

module.exports = { sanitizeFileName };