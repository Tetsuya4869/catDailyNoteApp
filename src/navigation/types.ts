import { HealthType } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  CatProfile: { catId: string };
  DiaryEntry: { id?: string; catId?: string; date?: string };
  DayDetail: { date: string };
  HealthRecordEdit: { catId: string; type?: HealthType };
  AppointmentEdit: { catId: string; id?: string };
  NewPost: undefined;
  CatEdit: { id?: string };
  Stats: undefined;
};

export type TabParamList = {
  Home: undefined;
  Calendar: undefined;
  NewPost: undefined;
  MyCats: undefined;
  Settings: undefined;
};
