export class TrelloCardDto {
  id: string;
  name: string;
  due: string | null;
  dueComplete: boolean;
  idBoard: string;
}
