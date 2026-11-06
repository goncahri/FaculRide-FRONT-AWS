export interface ChatbotOption {
  label: string;
  target: string;
}

export interface ChatbotNode {
  title: string;
  message: string;
  options?: ChatbotOption[];
}

export const CHATBOT_INITIAL_NODE = 'inicio';

export const CHATBOT_TREE: Record<string, ChatbotNode> = {
  inicio: {
    title: 'Como posso ajudar?',
    message: 'Escolha um assunto para encontrar a orientação que você precisa.',
    options: [
      { label: 'Sobre o FaculRide', target: 'sobre' },
      { label: 'Cadastro e conta', target: 'conta' },
      { label: 'Oferecer uma carona', target: 'oferecer' },
      { label: 'Encontrar uma carona', target: 'encontrar' },
      { label: 'Acompanhar uma carona', target: 'acompanhar' }
    ]
  },
  sobre: {
    title: 'Sobre o FaculRide',
    message: 'O que você gostaria de saber?',
    options: [
      { label: 'O que é o FaculRide?', target: 'sobre-o-que-e' },
      { label: 'Como funciona?', target: 'sobre-como-funciona' },
      { label: 'O FaculRide é gratuito?', target: 'sobre-gratuito' }
    ]
  },
  'sobre-o-que-e': {
    title: 'O que é o FaculRide?',
    message: 'É uma plataforma de caronas acadêmicas que conecta estudantes que oferecem vagas a colegas que procuram uma viagem compatível.'
  },
  'sobre-como-funciona': {
    title: 'Como funciona?',
    message: 'Após o cadastro, você pode oferecer ou procurar caronas. A plataforma ajuda a combinar rota, dias, horários e contato entre os participantes.'
  },
  'sobre-gratuito': {
    title: 'O FaculRide é gratuito?',
    message: 'Sim. O uso da plataforma é gratuito. Uma carona pode ter ajuda de custo informada pelo responsável pela oferta.'
  },
  conta: {
    title: 'Cadastro e conta',
    message: 'Escolha uma opção sobre acesso ao FaculRide.',
    options: [
      { label: 'Como criar uma conta?', target: 'conta-criar' },
      { label: 'Como entrar?', target: 'conta-entrar' }
    ]
  },
  'conta-criar': {
    title: 'Como criar uma conta?',
    message: 'Clique em “Cadastre-se”, selecione Passageiro ou Motorista e preencha os dados obrigatórios. Para motorista, também são solicitados CNH e dados do veículo.'
  },
  'conta-entrar': {
    title: 'Como entrar?',
    message: 'Clique em “Fazer login”, informe seu e-mail e sua senha cadastrados e selecione “Entrar”.'
  },
  oferecer: {
    title: 'Oferecer uma carona',
    message: 'Escolha a etapa em que você precisa de ajuda.',
    options: [
      { label: 'Como cadastrar uma oferta?', target: 'oferecer-cadastrar' },
      { label: 'Como escolher dias e horários?', target: 'oferecer-dias' },
      { label: 'Como informar ajuda de custo?', target: 'oferecer-custo' }
    ]
  },
  'oferecer-cadastrar': {
    title: 'Como cadastrar uma oferta?',
    message: 'Entre na sua conta, selecione “Oferecer carona”, informe partida, destino e os dados da viagem. Depois, confira as informações e salve a oferta.'
  },
  'oferecer-dias': {
    title: 'Como escolher dias e horários?',
    message: 'No formulário da carona, selecione as datas ou dias desejados e informe os horários de entrada e saída. Revise tudo antes de salvar.'
  },
  'oferecer-custo': {
    title: 'Como informar ajuda de custo?',
    message: 'Preencha o campo de ajuda de custo no formulário da carona. O valor ficará visível nos detalhes da oferta para os passageiros.'
  },
  encontrar: {
    title: 'Encontrar uma carona',
    message: 'Escolha como deseja continuar.',
    options: [
      { label: 'Como pesquisar e filtrar?', target: 'encontrar-pesquisar' },
      { label: 'Como conversar com o motorista?', target: 'encontrar-conversar' }
    ]
  },
  'encontrar-pesquisar': {
    title: 'Como pesquisar e filtrar?',
    message: 'Na área de caronas, use a pesquisa e os filtros para encontrar opções por trajeto, tipo de usuário ou proximidade. Abra a oferta para conferir os detalhes.'
  },
  'encontrar-conversar': {
    title: 'Como conversar com o motorista?',
    message: 'Abra uma carona que não seja sua e selecione “Conversar”. A conversa ficará disponível na área “Conversas” para combinar os detalhes.'
  },
  acompanhar: {
    title: 'Acompanhar uma carona',
    message: 'Escolha a ação que deseja realizar.',
    options: [
      { label: 'Como consultar a carona?', target: 'acompanhar-consultar' },
      { label: 'Como cancelar minha oferta?', target: 'acompanhar-cancelar' },
      { label: 'Como avaliar após a viagem?', target: 'acompanhar-avaliar' }
    ]
  },
  'acompanhar-consultar': {
    title: 'Como consultar a carona?',
    message: 'Acesse sua conta e abra “Minhas Caronas”. Ali você acompanha ofertas, caronas aceitas e caronas procuradas, com seus respectivos status.'
  },
  'acompanhar-cancelar': {
    title: 'Como cancelar minha oferta?',
    message: 'Em “Minhas Caronas”, localize uma oferta criada por você e use a opção de excluir enquanto ela ainda puder ser alterada. Confirme a ação quando solicitado.'
  },
  'acompanhar-avaliar': {
    title: 'Como avaliar após a viagem?',
    message: 'Após a conclusão da carona, abra o registro correspondente, escolha uma nota de 1 a 5 estrelas, escreva seu comentário e envie a avaliação.'
  }
};
