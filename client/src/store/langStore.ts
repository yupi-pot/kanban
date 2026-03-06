import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Lang = 'ru' | 'en'

interface LangState {
  lang: Lang
  toggle: () => void
}

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: 'ru',
      toggle: () => set({ lang: get().lang === 'ru' ? 'en' : 'ru' }),
    }),
    { name: 'kanban-lang' }
  )
)

const translations = {
  ru: {
    // Auth
    signIn: 'Войти',
    signUp: 'Регистрация',
    continueGoogle: 'Войти через Google',
    continueGithub: 'Войти через GitHub',
    or: 'или',
    name: 'Имя',
    email: 'Email',
    password: 'Пароль',
    loading: 'Загрузка...',
    createAccount: 'Создать аккаунт',
    yourName: 'Ваше имя',
    // Sidebar
    workspaces: 'Пространства',
    newBoard: 'Новая доска',
    newWorkspace: 'Новое пространство',
    workspaceName: 'Название пространства',
    myWorkspace: 'Моё пространство',
    create: 'Создать',
    creating: 'Создание...',
    out: 'Выйти',
    // Board
    addColumn: '+ Добавить колонку',
    addColumnTitle: 'Добавить колонку',
    columnName: 'Название колонки',
    adding: 'Добавление...',
    add: 'Добавить',
    cancel: 'Отмена',
    dropHere: 'Бросить сюда',
    // Card
    addCard: '+ Добавить задачу',
    cardTitle: 'Название задачи',
    priority: 'Приоритет',
    dueDate: 'Срок',
    description: 'Описание',
    assignees: 'Исполнители',
    deleteCard: 'Удалить',
    save: 'Сохранить',
    saving: 'Сохранение...',
    addDescription: 'Добавить описание...',
    // Workspace page
    members: 'участников',
    inviteMember: 'Пригласить',
    noBoards: 'Досок пока нет',
    createFirstBoard: 'Создать первую доску',
    membersTitle: 'Участники',
    boardName: 'Название доски',
    inviteEmail: 'email коллеги',
    inviting: 'Приглашение...',
    sendInvite: 'Отправить',
    // Empty states
    selectWorkspace: 'Выберите или создайте пространство',
    realtimeOn: 'Реалтайм подключён',
    realtimeOff: 'Реалтайм отключён',
  },
  en: {
    signIn: 'Sign in',
    signUp: 'Sign up',
    continueGoogle: 'Continue with Google',
    continueGithub: 'Continue with GitHub',
    or: 'or',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    loading: 'Loading...',
    createAccount: 'Create account',
    yourName: 'Your name',
    workspaces: 'Workspaces',
    newBoard: 'New board',
    newWorkspace: 'New workspace',
    workspaceName: 'Workspace name',
    myWorkspace: 'My workspace',
    create: 'Create',
    creating: 'Creating...',
    out: 'Out',
    addColumn: '+ Add column',
    addColumnTitle: 'Add column',
    columnName: 'Column name',
    adding: 'Adding...',
    add: 'Add',
    cancel: 'Cancel',
    dropHere: 'Drop here',
    addCard: '+ Add card',
    cardTitle: 'Card title',
    priority: 'Priority',
    dueDate: 'Due date',
    description: 'Description',
    assignees: 'Assignees',
    deleteCard: 'Delete',
    save: 'Save',
    saving: 'Saving...',
    addDescription: 'Add a description...',
    members: 'members',
    inviteMember: 'Invite member',
    noBoards: 'No boards yet',
    createFirstBoard: 'Create first board',
    membersTitle: 'Members',
    boardName: 'Board name',
    inviteEmail: 'colleague@example.com',
    inviting: 'Inviting...',
    sendInvite: 'Send invite',
    selectWorkspace: 'Select or create a workspace',
    realtimeOn: 'Realtime connected',
    realtimeOff: 'Realtime disconnected',
  },
}

export function useT() {
  const lang = useLangStore((s) => s.lang)
  return translations[lang]
}
